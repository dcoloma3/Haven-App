import { createContext, useContext, useEffect, useState } from 'react'
import { useCommunity } from './CommunityContext'

const FacilityContext = createContext({ facility: null, refresh: () => {} })

export function FacilityProvider({ children }) {
  const { community, reload } = useCommunity()
  const [facility, setFacility] = useState(null)

  useEffect(() => {
    if (community) {
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

export function useFacility() {
  return useContext(FacilityContext)
}
