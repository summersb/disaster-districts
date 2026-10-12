import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { UserDto } from '@/type/User'

const fetchUsers = async (): Promise<UserDto[]> => {
  const res = await authFetch('/api/users')
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

const fetchWardUsers = async (wardId: number): Promise<UserDto[]> => {
  const res = await authFetch(`/api/wards/${wardId}/users`)
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

export const useUsers = () =>
  useQuery<UserDto[]>({ queryKey: ['users'], queryFn: fetchUsers })

export const useWardUsers = (wardId: number) =>
  useQuery<UserDto[]>({
    queryKey: ['wardUsers', wardId],
    queryFn: () => fetchWardUsers(wardId),
    enabled: wardId > 0,
  })

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      roles,
      wardId,
      removeFromWard,
      memberId,
    }: {
      id: number
      roles?: string[]
      wardId?: number
      removeFromWard?: boolean
      // Links the login to a member record; 0 removes the link.
      memberId?: number
    }) =>
      authFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ roles, wardId, removeFromWard, memberId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}
