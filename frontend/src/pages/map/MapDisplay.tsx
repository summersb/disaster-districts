import { Alert, AlertDescription } from '@/components/ui/alert'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkers.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { useWard } from '@/hooks/useWards'
import { getWardId } from '@/lib/api'
import type { District, Member } from '@/type'
import type React from 'react'

type MapDisplayProps = {
  lat?: number
  lng?: number
  districts?: District[]
  members?: Member[]
  leader?: Member
  markerClicked?: (member: Member) => void
  onMapClick?: (lat: number, lng: number) => void
  showLabel: boolean
}

const MapDisplay = ({
  members,
  districts: districtsProp,
  lat,
  lng,
  markerClicked,
  onMapClick,
  showLabel,
}: MapDisplayProps): React.ReactElement => {
  const wardId = getWardId()
  const { data, isError, isLoading } = useMembers(wardId)
  const { data: districtsFromQuery, isLoading: districtsLoading } =
    useDistricts(wardId)
  const districts = districtsProp ?? districtsFromQuery
  const { data: ward } = useWard(wardId)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load members.</AlertDescription>
      </Alert>
    )
  }

  if (isLoading || districtsLoading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>
  }

  const memberList = members ?? data ?? []
  const mapped = memberList.filter((m) => m.lat !== undefined)
  // Caller-supplied coords (e.g. a district's lat/lng) win; otherwise fall back
  // to the user's ward, then a hard-coded default.
  const center = {
    lat: lat ?? ward?.lat ?? 33.1928423,
    lng: lng ?? ward?.lng ?? -117.2413057,
  }

  if (!districts) {
    return <div className="p-4 text-muted-foreground">Loading districts...</div>
  }

  if (mapped.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No members with location data to display.
      </div>
    )
  }

  return (
    <div className="h-full">
      <OSMMapWithMarkers
        districts={districts}
        members={mapped}
        center={center}
        markerClicked={markerClicked}
        onMapClick={onMapClick}
        showLabel={showLabel}
      />
    </div>
  )
}

export default MapDisplay
