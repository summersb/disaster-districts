import type React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getWardId } from '@/lib/api'
import { useDistricts } from '@/hooks/useDistricts'
import { Route as DistrictAddRoute } from '@/routes/_protected/district/add'
import DistrictCard from './DistrictCard'

const Districts = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: districts } = useDistricts(wardId)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Districts</h1>
        <Button
          onClick={() => navigate({ to: DistrictAddRoute.to })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add District
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {districts?.map((district) => (
          <DistrictCard
            key={district.id}
            district={district}
          />
        ))}
      </div>
    </div>
  )
}

export default Districts
