import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import type React from 'react'
import { Button } from '@/components/ui/button'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { Route as DistrictAddRoute } from '@/routes/_protected/district/add'
import DistrictCard from './DistrictCard'

const Districts = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: districts } = useDistricts(wardId)
  // One members request for the whole page; each card's count and
  // leader/assistant names are looked up from it.
  const { data: members = [] } = useMembers(wardId)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Districts</h1>
        <Button onClick={() => navigate({ to: DistrictAddRoute.to })}>
          <Plus className="w-4 h-4 mr-2" />
          Add District
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {districts?.map((district) => (
          <DistrictCard
            key={district.id}
            district={district}
            memberCount={
              members.filter((m) => m.district?.id === district.id).length
            }
            leader={members.find((m) => m.id === district.leaderId)}
            assistant={members.find((m) => m.id === district.assistantId)}
          />
        ))}
      </div>
    </div>
  )
}

export default Districts
