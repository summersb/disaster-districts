import { useEffect } from 'react'
import type React from 'react'
import { getWardId } from '@/lib/api'
import { useDistricts } from '@/hooks/useDistricts'

const PrintAllDistricts = (): React.ReactElement => {
  const wardId = getWardId()
  const { data: districts } = useDistricts(wardId)

  useEffect(() => {
    window.print()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">All Districts</h1>
      <div className="space-y-8">
        {districts?.map((district) => (
          <div key={district.id} className="page-break">
            <h2 className="text-2xl font-bold mb-4">{district.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              {district.members?.map((member) => (
                <div key={member.id} className="border p-2">
                  <p><strong>{member.familyName}</strong>, {member.name}</p>
                  {member.address1 && <p>{member.address1}</p>}
                  {member.city && <p>{member.city}, {member.state} {member.postalCode}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PrintAllDistricts
