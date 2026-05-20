import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(undefined) // undefined = still loading
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load(userId) {
      if (!userId) {
        if (mounted) { setProfile(null); setProfileError(null) }
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        if (error) throw error
        if (mounted) { setProfile(data ?? null); setProfileError(null) }
      } catch (err) {
        console.error('ProfileContext load error:', err)
        if (mounted) { setProfile(null); setProfileError(err?.message || 'Failed to load profile') }
      }
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user?.id ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user?.id ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <ProfileContext.Provider value={{
      profile,
      loading: profile === undefined,
      profileError,
      setProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  return useContext(ProfileContext)
}
