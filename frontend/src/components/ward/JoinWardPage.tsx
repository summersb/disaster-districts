import type { ColumnDef } from '@tanstack/react-table'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useUser from '@/context/useUser.tsx'
import {
  useCreateJoinRequest,
  useMyJoinRequests,
} from '@/hooks/useJoinRequests'
import { useWards } from '@/hooks/useWards'
import type { WardJoinRequestDto } from '@/type/WardJoinRequest'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'text-amber-700 dark:text-amber-400',
  APPROVED: 'text-green-700 dark:text-green-400',
  REJECTED: 'text-red-600 dark:text-red-400',
}

const REQUEST_COLUMNS: ColumnDef<WardJoinRequestDto>[] = [
  { accessorKey: 'wardName', header: 'Ward' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <span className={STATUS_STYLES[status] ?? ''}>
          {STATUS_LABELS[status] ?? status}
        </span>
      )
    },
  },
  {
    accessorKey: 'requestedAt',
    header: 'Requested',
    cell: ({ row }) => new Date(row.original.requestedAt).toLocaleString(),
  },
]

const JoinWardPage = (): React.ReactElement => {
  const { user } = useUser()
  const { data: wards = [], isLoading: wardsLoading } = useWards()
  const { data: myRequests = [] } = useMyJoinRequests(user.id)
  const createJoinRequest = useCreateJoinRequest()
  const [wardId, setWardId] = useState('')

  const pendingWardIds = new Set(
    myRequests.filter((r) => r.status === 'PENDING').map((r) => r.wardId),
  )
  // Wards they already belong to aren't offered again either.
  const joinedWardIds = new Set((user.wards ?? []).map((ward) => ward.id))
  const availableWards = wards.filter(
    (ward) =>
      ward.id == null ||
      (!pendingWardIds.has(ward.id) && !joinedWardIds.has(ward.id)),
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
          <p className="text-green-700 dark:text-green-400 mb-4">
            Request submitted. An admin will review it shortly.
          </p>
        )}
        {createJoinRequest.isError && (
          <p className="text-destructive mb-4">
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
              <SelectTrigger aria-label="Select a ward">
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
            <DataTable
              columns={REQUEST_COLUMNS}
              data={myRequests}
              searchPlaceholder="Search your requests..."
              pageSize={5}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export default JoinWardPage
