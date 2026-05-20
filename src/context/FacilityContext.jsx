import { createContext, useContext, useEffect, useState } from 'react'
import { useCommunity } from './CommunityContext'

const FacilityContext = createContext({ facility: null, refresh: () => {} })

export function FacilityProvider({ children }) {
  const { community, reload } = useCommunity()
  const [facility, setFacility] = useState(null)

  useEffect(() => {
    if (community) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFacility({
        id: community.id,
        facility_name: community.name,
        license_number: community.license_number,
        address: community.address,
        phone_number: community.phone,
        email: community.email,
        website: community.website,
      })
    } else {
      setFacility(null)
    }
  }, [community])

  return (
    <FacilityContext.Provider value={{ facility, refresh: reload }}>
      {children}
    </FacilityContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFacility() {
  return useContext(FacilityContext)
}
