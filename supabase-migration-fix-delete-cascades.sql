-- ============================================================
-- Fix: Delete Community blocked by foreign keys
-- Deleting a community failed with "violates foreign key constraint
-- residents_community_id_fkey" because the community/resident foreign
-- keys were not ON DELETE CASCADE. This sets every FK that points at
-- communities or residents to cascade, so deleting a community cleanly
-- removes its residents and all their records (what the delete warning
-- already promises). Only affects DELETE behavior. Idempotent.
-- ============================================================

do $$
declare r record; col text; parent text;
begin
  for r in
    select con.conname, con.conrelid, con.confrelid, con.conkey, cl.relname as child_table
    from pg_constraint con
    join pg_class cl  on cl.oid  = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    where con.contype = 'f'
      and ref.relname in ('communities', 'residents')
      and con.connamespace = 'public'::regnamespace
      and con.confdeltype <> 'c'            -- not already ON DELETE CASCADE
  loop
    select a.attname into col
      from pg_attribute a
     where a.attrelid = r.conrelid and a.attnum = r.conkey[1];
    select relname into parent from pg_class where oid = r.confrelid;
    execute format('alter table public.%I drop constraint %I', r.child_table, r.conname);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete cascade',
                   r.child_table, r.conname, col, parent);
  end loop;
end $$;
