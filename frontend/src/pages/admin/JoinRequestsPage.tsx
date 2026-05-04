import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useState } from 'react'

export interface JoinRequest {
  id: number
  userId: number
  userEmail: string
  wardId: number
  wardName: string
  status: string
  message: string | null
  requestedAt: string
  assignedRole: string | null
}

const JoinRequestsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedRoles, setSelectedRoles] = useState<{ [key: number]: string }>({})
  const [submitting, setSubmitting] = useState<number | null>(null)

  const { data: requests, isLoading } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      const res = await fetch('/api/join-requests')
      if (!res.ok) throw new Error('Failed to fetch join requests')
      return (await res.json()) as JoinRequest[]
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, approve, role }: { id: number; approve: boolean; role?: string }) => {
      const res = await fetch(`/api/join-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, assignedRole: role || 'user' }),
      })
      if (!res.ok) throw new Error('Failed to resolve request')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] })
      setSelectedRoles({})
    },
  })

  const handleApprove = (id: number) => {
    const role = selectedRoles[id] || 'user'
    setSubmitting(id)
    resolveMutation.mutate(
      { id, approve: true, role },
      {
        onSettled: () => setSubmitting(null),
      }
    )
  }

  const handleReject = (id: number) => {
    setSubmitting(id)
    resolveMutation.mutate(
      { id, approve: false },
      {
        onSettled: () => setSubmitting(null),
      }
    )
  }

  if (isLoading) return <div>Loading...</div>

  const pendingRequests = requests?.filter((r) => r.status === 'PENDING') || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ward Join Requests</h1>
        <p className="text-gray-600">Review and approve/reject user requests to join wards</p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
          No pending join requests
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.userEmail}</TableCell>
                  <TableCell>{request.wardName}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-600">{request.message}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={selectedRoles[request.id] || 'user'}
                        onValueChange={(value) => setSelectedRoles({ ...selectedRoles, [request.id]: value })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="ward_admin">Ward Admin</SelectItem>
                          <SelectItem value="district_admin">District Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={submitting === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {submitting === request.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={submitting === request.id}
                      >
                        {submitting === request.id ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default JoinRequestsPage
