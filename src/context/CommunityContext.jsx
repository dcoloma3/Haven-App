import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CommunityContext = createContext(null)

export function CommunityProvider({ children }) {
  const [memberships, setMemberships] = useState(null)
  const [activeCommunityId, setActiveCommunityId] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [allCommunities, setAllCommunities] = useState([])
  const [editMode, setEditMode] = useState(false)

  const load = useCallback(async (userId, email) => {
    if (!userId) {
      setMemberships([])
      setActiveCommunityId(null)
      setIsSuperAdmin(false)
      setAllCommunities([])
      return
    }

    // Check super admin by email
    const { data: saData } = await supabase
      .from('super_admins')
      .select('id')
      .eq('email', email ?? '')
      .maybeSingle()

    const superAdmin = !!saData
    setIsSuperAdmin(superAdmin)

    // Load this user's community memberships
    const { data } = await supabase
      .from('community_members')
      .select('role, communities(*)')
      .eq('user_id', userId)
    const list = data ?? []
    setMemberships(list)
    if (list.length === 1) setActiveCommunityId(list[0].communities.id)

    // Super admin gets full list of all communities
    if (superAdmin) {
      const { data: all } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })
      setAllCommunities(all ?? [])
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      load(data.session?.user?.id ?? null, data.session?.user?.email ?? '')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setMemberships([])
        setActiveCommunityId(null)
        setIsSuperAdmin(false)
        setAllCommunities([])
      } else {
        load(session.user.id, session.user.email)
      }
    })
    return () => subscription.unsubscribe()
  }, [load])

  // Resolve active community — check memberships first, then allCommunities (for super admin)
  const membershipMatch = memberships?.find(m => m.communities?.id === activeCommunityId)
  const community = membershipMatch?.communities
    ?? allCommunities.find(c => c.id === activeCommunityId)
    ?? null
  const role = isSuperAdmin ? 'admin' : (membershipMatch?.role ?? null)

  async function reload() {
    const { data } = await supabase.auth.getSession()
    await load(data.session?.user?.id ?? null, data.session?.user?.email ?? '')
  }

  async function reloadAllCommunities() {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false })
    setAllCommunities(data ?? [])
  }

  return (
    <CommunityContext.Provider value={{
      memberships: memberships ?? [],
      community,
      communityId: activeCommunityId,
      role,
      isAdmin: isSuperAdmin || role === 'admin',
      isSuperAdmin,
      allCommunities,
      editMode: isSuperAdmin ? editMode : true,
      setEditMode,
      loading: memberships === null,
      setCommunityId: setActiveCommunityId,
      reload,
      reloadAllCommunities,
    }}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  return useContext(CommunityContext)
}
