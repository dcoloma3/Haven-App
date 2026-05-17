import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CommunityContext = createContext(null)

export function CommunityProvider({ children }) {
  const [memberships, setMemberships] = useState(null)
  const [activeCommunityId, setActiveCommunityId] = useState(() => {
    try { return localStorage.getItem('haven_community_id') || null } catch { return null }
  })
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [allCommunities, setAllCommunities] = useState([])
  const [editMode] = useState(true) // super admin always has full edit access
  const [loadError, setLoadError] = useState(null)
  const [viewAsRole, setViewAsRole] = useState(null) // null = real role, 'staff' = preview as staff

  const load = useCallback(async (userId, email) => {
    if (!userId) {
      setMemberships([])
      setActiveCommunityId(null)
      setIsSuperAdmin(false)
      setAllCommunities([])
      setLoadError(null)
      return
    }

    try {
      // Check super admin by email
      const { data: saData } = await supabase
        .from('super_admins')
        .select('id')
        .eq('email', email ?? '')
        .maybeSingle()

      const superAdmin = !!saData
      setIsSuperAdmin(superAdmin)

      // Load this user's community memberships
      const { data, error: membErr } = await supabase
        .from('community_members')
        .select('role, communities(*)')
        .eq('user_id', userId)
      if (membErr) throw membErr
      const list = data ?? []
      setMemberships(list)
      if (list.length === 1) {
        setActiveCommunityId(prev => {
          const id = prev || list[0].communities.id
          try { localStorage.setItem('haven_community_id', id) } catch {}
          return id
        })
      }

      // Super admin gets full list of all communities
      if (superAdmin) {
        const { data: all } = await supabase
          .from('communities')
          .select('*')
          .order('created_at', { ascending: false })
        setAllCommunities(all ?? [])
      }

      setLoadError(null)
    } catch (err) {
      console.error('CommunityContext load error:', err)
      setMemberships([]) // unblock the loading spinner
      setLoadError(err?.message || 'Failed to load community data')
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
        try { localStorage.removeItem('haven_community_id') } catch {}
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
  // When previewing as staff, override admin access so the UI reflects what staff sees
  const effectiveIsAdmin = viewAsRole === 'staff' ? false : (isSuperAdmin || role === 'admin')

  async function reload() {
    const { data } = await supabase.auth.getSession()
    await load(data.session?.user?.id ?? null, data.session?.user?.email ?? '')
  }

  function setEditMode() {} // no-op kept for any legacy references

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
      isAdmin: effectiveIsAdmin,
      isSuperAdmin,
      allCommunities,
      editMode: true,
      loading: memberships === null,
      loadError,
      viewAsRole,
      setViewAsRole,
      setCommunityId: (id) => {
        try { id ? localStorage.setItem('haven_community_id', id) : localStorage.removeItem('haven_community_id') } catch {}
        setActiveCommunityId(id)
      },
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
