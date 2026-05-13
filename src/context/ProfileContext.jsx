import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(undefined) // undefined = still loading

  useEffect(() => {
    let mounted = true

    async function load(userId) {
      if (!userId) {
        if (mounted) setProfile(null)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (mounted) setProfile(data ?? null)
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
      isAdmin: profile?.role === 'admin',
      loading: profile === undefined,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
