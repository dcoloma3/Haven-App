import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const FacilityContext = createContext({ facility: null, refresh: () => {} })

export function FacilityProvider({ children }) {
  const [facility, setFacility] = useState(null)

  async function refresh() {
    const { data } = await supabase
      .from('facility_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    setFacility(data)
  }

  useEffect(() => { refresh() }, [])

  return (
    <FacilityContext.Provider value={{ facility, refresh }}>
      {children}
    </FacilityContext.Provider>
  )
}

export function useFacility() {
  return useContext(FacilityContext)
}
