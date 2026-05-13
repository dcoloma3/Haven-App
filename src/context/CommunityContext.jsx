import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CommunityContext = createContext(null)

export function CommunityProvider({ children }) {
  const [memberships, setMemberships] = useState(null) // null = still loading
  const [activeCommunityId, setActiveCommunityId] = useState(null)

  const load = useCallback(async (userId) => {
    if (!userId) { setMemberships([]); setActiveCommunityId(null); return }
    const { data } = await supabase
      .from('community_members')
      .select('role, communities(*)')
      .eq('user_id', userId)
    const list = data ?? []
    setMemberships(list)
    if (list.length === 1) setActiveCommunityId(list[0].communities.id)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user?.id ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setMemberships([]); setActiveCommunityId(null) }
      else load(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [load])

  const active = memberships?.find(m => m.communities?.id === activeCommunityId)

  async function reload() {
    const { data } = await supabase.auth.getSession()
    await load(data.session?.user?.id ?? null)
  }

  return (
    <CommunityContext.Provider value={{
      memberships: memberships ?? [],
      community: active?.communities ?? null,
      communityId: activeCommunityId,
      role: active?.role ?? null,
      isAdmin: active?.role === 'admin',
      loading: memberships === null,
      setCommunityId: setActiveCommunityId,
      reload,
    }}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  return useContext(CommunityContext)
}
