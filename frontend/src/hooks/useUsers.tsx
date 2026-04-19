import { authFetch } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type UserRecord = {
  id: number
  email: string
  roles: string[]
  wardId?: number
}

const fetchUsers = async (): Promise<UserRecord[]> => {
  const res = await authFetch('/api/users')
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

const fetchWardUsers = async (wardId: number): Promise<UserRecord[]> => {
  const res = await authFetch(`/api/wards/${wardId}/users`)
  if (!res.ok) return []
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

export const useUsers = () =>
  useQuery<UserRecord[]>({ queryKey: ['users'], queryFn: fetchUsers })

export const useWardUsers = (wardId: number) =>
  useQuery<UserRecord[]>({
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
    }: {
      id: number
      roles?: string[]
      wardId?: number
      removeFromWard?: boolean
    }) =>
      authFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ roles, wardId, removeFromWard }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}
