import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
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
  const lastUserIdRef = useRef(null)

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

      // Always validate the stored community ID against this user's actual memberships.
      // Without this check, a stale localStorage value from a previous user on the same
      // browser would cause cross-account data leakage.
      setActiveCommunityId(prev => {
        const validIds = list.map(m => m.communities?.id).filter(Boolean)
        // Keep the stored ID only if it actually belongs to this user (or they're a super admin)
        if (prev && (validIds.includes(prev) || superAdmin)) {
          try { localStorage.setItem('haven_community_id', prev) } catch {}
          return prev
        }
        // Otherwise fall back to the first community in their membership list
        const id = list[0]?.communities?.id ?? null
        try {
          if (id) {
            localStorage.setItem('haven_community_id', id)
          } else {
            localStorage.removeItem('haven_community_id')
          }
        } catch {}
        return id
      })

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setMemberships([])
        setActiveCommunityId(null)
        try { localStorage.removeItem('haven_community_id') } catch {}
        setIsSuperAdmin(false)
        setAllCommunities([])
      } else {
        // On a fresh sign-in, clear the stored community ID immediately so the
        // validation in load() always picks the correct community for this user,
        // rather than accidentally keeping a value left by a previous user.
        if (event === 'SIGNED_IN' && session.user.id !== lastUserIdRef.current) {
          // Genuinely new user — clear to prevent cross-user data leakage
          try { localStorage.removeItem('haven_community_id') } catch {}
          setActiveCommunityId(null)
        }
        lastUserIdRef.current = session.user.id
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
