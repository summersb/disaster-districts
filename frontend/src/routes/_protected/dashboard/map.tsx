import { createFileRoute } from '@tanstack/react-router'
import MapDisplay from '@/components/OSMMapWithMarkers'
import { getWardId } from '@/lib/api'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'

export const Route = createFileRoute('/_protected/dashboard/map')({
  component: RouteComponent,
})

function RouteComponent() {
  const wardId = getWardId()
  const { data: districts = [] } = useDistricts(wardId)
  const { data: members = [] } = useMembers(wardId)

  return (
    <div className="h-screen">
      <MapDisplay districts={districts} members={members} showLabel={false} />
    </div>
  )
}
