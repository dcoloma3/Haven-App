import { supabase } from './supabase'

/**
 * Creates the community, community_member, and profile records for a new trial user.
 * Called immediately after signup (if email confirmation is off) or after
 * the user clicks the confirmation link and returns to the app.
 */
export async function completeTrial({ userId, email, firstName, lastName, communityName, residentCount }) {
  const fullName = `${firstName} ${lastName}`
  const trialStart = new Date()
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)

  const { data: community, error: communityErr } = await supabase
    .from('communities')
    .insert([{
      name: communityName,
      plan: 'trial',
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      resident_count_at_signup: residentCount,
    }])
    .select()
    .single()

  if (communityErr) throw communityErr

  // Helper: delete the community if a later step fails (orphan prevention)
  async function rollback(err) {
    await supabase.from('communities').delete().eq('id', community.id)
    throw err
  }

  const { error: memberErr } = await supabase.from('community_members').insert([{
    community_id: community.id,
    user_id: userId,
    role: 'admin',
  }])

  if (memberErr) await rollback(memberErr)

  const { error: profileErr } = await supabase.from('profiles').upsert([{
    user_id: userId,
    email,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    onboarding_complete: true,
    profile_completed: true,
  }], { onConflict: 'user_id' })

  if (profileErr) await rollback(profileErr)

  return community
}
