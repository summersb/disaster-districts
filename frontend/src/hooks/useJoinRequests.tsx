import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { WardJoinRequestDto } from '@/type/WardJoinRequest'

const fetchJoinRequests = async (): Promise<WardJoinRequestDto[]> => {
  const res = await authFetch('/api/join-requests')
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

export const useJoinRequests = () =>
  useQuery<WardJoinRequestDto[]>({
    queryKey: ['joinRequests'],
    queryFn: fetchJoinRequests,
  })

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
