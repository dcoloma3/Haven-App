import { supabase } from './supabase'

/**
 * Creates a community + member record + profile in a single atomic Postgres transaction.
 * Uses the complete_trial() RPC defined in supabase-migration-trial-signup-rpc.sql.
 */
export async function completeTrial({
  userId,
  email,
  firstName,
  lastName,
  communityName,
  residentCount,
}) {
  const { data, error } = await supabase.rpc('complete_trial', {
    p_user_id: userId,
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_community_name: communityName,
    p_resident_count: residentCount,
  })
  if (error) throw error
  // data is the new community UUID returned by the function
  return { id: data }
}
