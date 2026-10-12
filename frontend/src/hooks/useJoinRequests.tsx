import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { WardJoinRequestDto } from '@/type/WardJoinRequest'

const fetchJoinRequests = async (): Promise<WardJoinRequestDto[]> => {
  const res = await authFetch('/api/join-requests')
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

const fetchMyJoinRequests = async (
  userId: number,
): Promise<WardJoinRequestDto[]> => {
  const res = await authFetch(`/api/join-requests?userId=${userId}`)
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

// Pending requests the caller may act on: every ward's for a system admin,
// their own ward's for a ward admin (the server does the scoping).
export const useJoinRequests = (enabled = true) =>
  useQuery<WardJoinRequestDto[]>({
    queryKey: ['joinRequests'],
    queryFn: fetchJoinRequests,
    enabled,
  })

export const useMyJoinRequests = (userId: number | undefined) =>
  useQuery<WardJoinRequestDto[]>({
    queryKey: ['joinRequests', 'mine', userId],
    queryFn: () => fetchMyJoinRequests(userId as number),
    enabled: userId != null,
  })

export const useCreateJoinRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      wardId,
    }: {
      userId: number
      wardId: number
    }) => {
      const res = await authFetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, wardId }),
      })
      if (!res.ok) throw new Error('Failed to join ward')
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['joinRequests', 'mine', variables.userId],
      })
    },
  })
}

export const useResolveJoinRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      approve,
      assignedRole,
      memberId,
    }: {
      id: number
      approve: boolean
      assignedRole?: string
      // When approving: the ward member this account is, linked in the same
      // step.
      memberId?: number
    }) =>
      authFetch(`/api/join-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ approve, assignedRole, memberId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}
