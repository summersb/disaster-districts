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

export const useJoinRequests = () =>
  useQuery<WardJoinRequestDto[]>({
    queryKey: ['joinRequests'],
    queryFn: fetchJoinRequests,
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
    }: {
      id: number
      approve: boolean
      assignedRole?: string
    }) =>
      authFetch(`/api/join-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ approve, assignedRole }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}
