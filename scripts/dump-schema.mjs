/**
 * dump-schema.mjs
 * Introspects the live Supabase schema via information_schema and pg_catalog,
 * then emits a CREATE TABLE + policy report to stdout.
 *
 * Usage:
 *   SUPABASE_SERVICE_KEY=sb_secret_... node scripts/dump-schema.mjs > supabase-schema-full.sql
 */

const PROJECT_URL = 'https://gpclfdnkvkffpjccurqh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('ERROR: set SUPABASE_SERVICE_KEY env var first')
  process.exit(1)
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function rpc(sql) {
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    // Try the pg_dump-via-management-api approach instead
    return null
  }
  return res.json()
}

// Use PostgREST direct table queries on information_schema
async function query(table, select = '*', filter = '') {
  const url = `${PROJECT_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? '&' + filter : ''}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Query failed on ${table}: ${err}`)
  }
  return res.json()
}

// Use the Supabase Management API to run arbitrary SQL
async function sql(query) {
  // Management API requires a different token (Personal Access Token)
  // Fall back to running via the REST /rpc endpoint with service key
  const res = await fetch(`${PROJECT_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ query }),
  })
  return res
}

async function main() {
  console.log('-- ============================================================')
  console.log('-- supabase-schema-full.sql')
  console.log(`-- Generated: ${new Date().toISOString()}`)
  console.log('-- Project:   gpclfdnkvkffpjccurqh.supabase.co')
  console.log('-- IMPORTANT: This file is for REFERENCE and fresh-install only.')
  console.log('--            Do NOT run against an existing production database.')
  console.log('-- ============================================================')
  console.log()

  // Fetch columns from information_schema
  const cols = await fetch(
    `${PROJECT_URL}/rest/v1/information_schema.columns?table_schema=eq.public&select=table_name,column_name,ordinal_position,column_default,is_nullable,data_type,udt_name,character_maximum_length,numeric_precision&order=table_name,ordinal_position`,
    { headers }
  )
  
  if (!cols.ok) {
    const errText = await cols.text()
    console.error('-- ERROR fetching columns:', errText)
    console.error('-- The service role key may need to be the full secret key.')
    process.exit(1)
  }

  const columns = await cols.json()

  // Group by table
  const tables = {}
  for (const col of columns) {
    if (!tables[col.table_name]) tables[col.table_name] = []
    tables[col.table_name].push(col)
  }

  // Fetch primary keys
  const pkRes = await fetch(
    `${PROJECT_URL}/rest/v1/information_schema.table_constraints?table_schema=eq.public&constraint_type=eq.PRIMARY KEY&select=table_name,constraint_name`,
    { headers }
  )
  const pks = pkRes.ok ? await pkRes.json() : []

  const pkColRes = await fetch(
    `${PROJECT_URL}/rest/v1/information_schema.key_column_usage?table_schema=eq.public&select=table_name,column_name,constraint_name`,
    { headers }
  )
  const pkCols = pkColRes.ok ? await pkColRes.json() : []

  const pkMap = {}
  for (const pk of pks) {
    const cols = pkCols.filter(c => c.constraint_name === pk.constraint_name && c.table_name === pk.table_name)
    pkMap[pk.table_name] = cols.map(c => c.column_name)
  }

  // Emit CREATE TABLE statements
  for (const [tableName, cols] of Object.entries(tables).sort()) {
    const pkCols = pkMap[tableName] || []
    console.log(`-- ── ${tableName} ──`)
    console.log(`create table if not exists ${tableName} (`)
    
    const colDefs = cols.map(col => {
      let type = col.udt_name
      if (col.data_type === 'character varying') type = col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'text'
      else if (col.data_type === 'ARRAY') type = `${col.udt_name.replace(/^_/, '')}[]`
      else if (col.data_type === 'USER-DEFINED') type = col.udt_name
      else if (col.data_type === 'integer') type = 'integer'
      else if (col.data_type === 'bigint') type = 'bigint'
      else if (col.data_type === 'boolean') type = 'boolean'
      else if (col.data_type === 'text') type = 'text'
      else if (col.data_type === 'timestamp with time zone') type = 'timestamptz'
      else if (col.data_type === 'timestamp without time zone') type = 'timestamp'
      else if (col.data_type === 'date') type = 'date'
      else if (col.data_type === 'numeric') type = 'numeric'
      else if (col.data_type === 'uuid') type = 'uuid'
      else if (col.data_type === 'jsonb') type = 'jsonb'
      else if (col.data_type === 'json') type = 'json'

      let def = `  ${col.column_name} ${type}`
      if (pkCols.includes(col.column_name)) def += ' primary key'
      if (col.column_default) def += ` default ${col.column_default}`
      if (col.is_nullable === 'NO' && !pkCols.includes(col.column_name)) def += ' not null'
      return def
    })
    
    console.log(colDefs.join(',\n'))
    console.log(');')
    console.log(`alter table ${tableName} enable row level security;`)
    console.log()
  }

  console.log('-- ============================================================')
  console.log('-- END OF SCHEMA DUMP')
  console.log('-- ============================================================')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
