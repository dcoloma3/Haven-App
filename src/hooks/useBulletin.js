import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'

/**
 * Data layer for the Staff Bulletin Board feature.
 *
 * Returns:
 *   bulletin       – the current active bulletin row, or null
 *   loading        – true while the initial fetch is in flight
 *   error          – string error message, or null
 *   postBulletin   – async (title, message, userId) → { error }
 *   clearBulletin  – async (bulletinId) → { error }
 *   refetch        – manually re-run the active-bulletin query
 */
export function useBulletin() {
  const { communityId } = useCommunity()
  const [bulletin, setBulletin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBulletin = useCallback(async () => {
    if (!communityId) {
      setBulletin(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('community_bulletins')
      .select('*')
      .eq('community_id', communityId)
      .is('cleared_at', null)
      .order('posted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      setBulletin(null)
    } else {
      setBulletin(data ?? null)
    }

    setLoading(false)
  }, [communityId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBulletin()
  }, [fetchBulletin])

  /**
   * Creates or updates the active bulletin for this community.
   * If an active bulletin already exists it is updated in-place (title + message).
   * If no active bulletin exists a new row is inserted.
   *
   * @param {string} title
   * @param {string} message
   * @param {string} userId  – auth.users UUID of the posting staff member
   * @returns {{ error: string|null }}
   */
  async function postBulletin(title, message, userId) {
    if (!communityId) return { error: 'No active community' }

    if (bulletin) {
      // Active bulletin exists — update it
      const { error: updateError } = await supabase
        .from('community_bulletins')
        .update({ title, message, updated_at: new Date().toISOString() })
        .eq('id', bulletin.id)
        .eq('community_id', communityId)

      if (updateError) return { error: updateError.message }
    } else {
      // No active bulletin — insert a new one
      const { error: insertError } = await supabase
        .from('community_bulletins')
        .insert({
          community_id: communityId,
          title,
          message,
          posted_by: userId ?? null,
        })

      if (insertError) return { error: insertError.message }
    }

    await fetchBulletin()
    return { error: null }
  }

  /**
   * Marks a bulletin as cleared (soft-delete).
   *
   * @param {string} bulletinId  – UUID of the bulletin row to clear
   * @returns {{ error: string|null }}
   */
  async function clearBulletin(bulletinId) {
    if (!communityId) return { error: 'No active community' }

    const { error: clearError } = await supabase
      .from('community_bulletins')
      .update({ cleared_at: new Date().toISOString() })
      .eq('id', bulletinId)
      .eq('community_id', communityId)

    if (clearError) return { error: clearError.message }

    await fetchBulletin()
    return { error: null }
  }

  return {
    bulletin,
    loading,
    error,
    postBulletin,
    clearBulletin,
    refetch: fetchBulletin,
  }
}
