import type React from 'react'
import { useState } from 'react'
import MemberPicker from '@/components/members/MemberPicker'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJoinRequests, useResolveJoinRequest } from '@/hooks/useJoinRequests'
import { GRANTABLE_ROLES, ROLE_LABELS } from '@/lib/roles'
import type { WardJoinRequestDto } from '@/type/WardJoinRequest'

type ManageRequestsProps = {
  // Show only requests for this ward (the Admin page's selected ward).
  // Without it, every request the user may act on is listed.
  wardId?: number
}

const ManageRequests = ({
  wardId,
}: ManageRequestsProps): React.ReactElement => {
  const { data: allRequests = [], isLoading } = useJoinRequests()
  const requests =
    wardId == null
      ? allRequests
      : allRequests.filter((request) => request.wardId === wardId)
  const resolveRequest = useResolveJoinRequest()
  const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({})
  // The ward member chosen for each request, to link on approval (0 = none).
  const [selectedMembers, setSelectedMembers] = useState<
    Record<number, number>
  >({})
  const [error, setError] = useState('')

  const approve = async (request: WardJoinRequestDto) => {
    setError('')
    try {
      const res = await resolveRequest.mutateAsync({
        id: request.id,
        approve: true,
        assignedRole: selectedRoles[request.id] ?? 'user',
        memberId: selectedMembers[request.id] || undefined,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Could not approve (${res.status})`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve')
    }
  }

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
      {error && <p className="text-sm text-destructive">{error}</p>}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Linking the account to the person's member record now is
                what lets a district leader use their district straight
                away; it can also be done later from the users table. */}
            <MemberPicker
              wardId={request.wardId}
              value={selectedMembers[request.id] ?? 0}
              onChange={(memberId) =>
                setSelectedMembers((prev) => ({
                  ...prev,
                  [request.id]: memberId,
                }))
              }
              placeholder="Link to member (optional)"
              label={`Link ${request.userEmail} to a member`}
              disabled={resolveRequest.isPending}
            />
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
              onClick={() => approve(request)}
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
