import type React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getWardId } from '@/lib/api'
import { useMembers } from '@/hooks/useMembers'
import { Route as MemberAddRoute } from '@/routes/_protected/member/add'
import { Route as MemberEditRoute } from '@/routes/_protected/member/index'

const MemberList = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: members } = useMembers(wardId)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button
          onClick={() => navigate({ to: MemberAddRoute.to })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Address</th>
              <th className="border p-2 text-left">City</th>
              <th className="border p-2 text-left">District</th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members?.map((member) => (
              <tr key={member.id} className="hover:bg-gray-100">
                <td className="border p-2">{member.familyName}, {member.name}</td>
                <td className="border p-2">{member.address1}</td>
                <td className="border p-2">{member.city}</td>
                <td className="border p-2">{member.district?.name}</td>
                <td className="border p-2 text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate({
                        to: MemberEditRoute.to,
                        params: { id: String(member.id) },
                      })
                    }
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MemberList
