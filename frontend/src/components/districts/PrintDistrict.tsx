import type React from 'react'
import { useEffect } from 'react'
import { useDistrict } from '@/hooks/useDistricts'
import { getWardId } from '@/lib/api'

type PrintDistrictProps = {
  districtId: number
}

const PrintDistrict = ({
  districtId,
}: PrintDistrictProps): React.ReactElement => {
  const wardId = getWardId()
  const { data: district } = useDistrict(wardId, districtId)

  useEffect(() => {
    window.print()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">{district?.name}</h1>
      <div className="grid grid-cols-2 gap-4">
        {district?.members?.map((member) => (
          <div key={member.id} className="border p-2">
            <p>
              <strong>{member.familyName}</strong>, {member.name}
            </p>
            {member.address1 && <p>{member.address1}</p>}
            {member.city && (
              <p>
                {member.city}, {member.state} {member.postalCode}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PrintDistrict
