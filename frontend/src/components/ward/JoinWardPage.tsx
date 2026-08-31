import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useUser from '@/context/useUser.tsx'
import {
  useCreateJoinRequest,
  useMyJoinRequests,
} from '@/hooks/useJoinRequests'
import { useWards } from '@/hooks/useWards'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'text-amber-600',
  APPROVED: 'text-green-600',
  REJECTED: 'text-red-600',
}

const JoinWardPage = (): React.ReactElement => {
  const { user } = useUser()
  const { data: wards = [], isLoading: wardsLoading } = useWards()
  const { data: myRequests = [] } = useMyJoinRequests(user.id)
  const createJoinRequest = useCreateJoinRequest()
  const [wardId, setWardId] = useState('')

  const pendingWardIds = new Set(
    myRequests.filter((r) => r.status === 'PENDING').map((r) => r.wardId),
  )
  const availableWards = wards.filter(
    (ward) => ward.id == null || !pendingWardIds.has(ward.id),
  )

  const handleJoin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user.id) return
    createJoinRequest.mutate(
      { userId: user.id, wardId: Number(wardId) },
      { onSuccess: () => setWardId('') },
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6">Join a Ward</h1>

        {createJoinRequest.isSuccess && (
          <p className="text-green-600 mb-4">
            Request submitted. An admin will review it shortly.
          </p>
        )}
        {createJoinRequest.isError && (
          <p className="text-red-500 mb-4">
            {createJoinRequest.error instanceof Error
              ? createJoinRequest.error.message
              : 'Failed to join ward'}
          </p>
        )}

        {!wardsLoading && availableWards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have a pending request for every ward. An admin needs to review
            one before you can request another.
          </p>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <Select value={wardId} onValueChange={setWardId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    wardsLoading ? 'Loading wards...' : 'Select a ward'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableWards.map((ward) => (
                  <SelectItem key={ward.id} value={String(ward.id)}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={createJoinRequest.isPending || !wardId}
              className="w-full"
            >
              {createJoinRequest.isPending ? 'Joining...' : 'Join Ward'}
            </Button>
          </form>
        )}

        {myRequests.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold mb-2">Your requests</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.wardName}</TableCell>
                    <TableCell className={STATUS_STYLES[request.status] ?? ''}>
                      {STATUS_LABELS[request.status] ?? request.status}
                    </TableCell>
                    <TableCell>
                      {new Date(request.requestedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default JoinWardPage
