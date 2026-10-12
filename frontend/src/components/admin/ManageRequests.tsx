import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJoinRequests, useResolveJoinRequest } from '@/hooks/useJoinRequests'
import { ALL_ROLES, ROLE_LABELS } from '@/lib/roles'

const GRANTABLE_ROLES = ALL_ROLES.filter((role) => role !== 'admin')

const ManageRequests = (): React.ReactElement => {
  const { data: requests = [], isLoading } = useJoinRequests()
  const resolveRequest = useResolveJoinRequest()
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({})

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        No pending requests.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center justify-between gap-4 rounded-md border p-3"
        >
          <div>
            <p className="font-medium">{request.userEmail}</p>
            <p className="text-sm text-muted-foreground">
              Wants to join {request.wardName}
            </p>
            {request.message && (
              <p className="text-sm italic text-muted-foreground">
                &quot;{request.message}&quot;
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedRoles[request.id] ?? 'user'}
              onValueChange={(role) =>
                setSelectedRoles((prev) => ({ ...prev, [request.id]: role }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANTABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="destructive"
              disabled={resolveRequest.isPending}
              onClick={() =>
                resolveRequest.mutate({ id: request.id, approve: false })
              }
            >
              Reject
            </Button>
            <Button
              size="sm"
              disabled={resolveRequest.isPending}
              onClick={() =>
                resolveRequest.mutate({
                  id: request.id,
                  approve: true,
                  assignedRole: selectedRoles[request.id] ?? 'user',
                })
              }
            >
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ManageRequests
