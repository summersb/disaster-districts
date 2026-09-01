import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { WardDto } from '@/type/Ward.ts'

const loadWards = async () => {
  const res = await authFetch('/api/wards')
  return await res.json()
}

const loadWard = async (wardId: number) => {
  const res = await authFetch(`/api/wards/${wardId}`)
  return await res.json()
}

export const useWards = () => {
  return useQuery<WardDto[]>({
    queryKey: ['wards'],
    queryFn: loadWards,
  })
}

export const useWard = (wardId: number) => {
  return useQuery<WardDto>({
    queryKey: ['ward', wardId],
    queryFn: () => loadWard(wardId),
    enabled: wardId > 0,
  })
}

export const useCreateWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ward: { name: string }): Promise<{ id?: number }> => {
      const res = await authFetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ward),
      })
      if (!res.ok) {
        throw new Error(
          res.status === 409
            ? 'A ward with that name already exists'
            : 'Failed to create ward',
        )
      }
      const location = res.headers.get('location')
      const id = location ? Number(location.split('/').pop()) : undefined
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
    },
  })
}

export const useDeleteWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (wardId: number) =>
      authFetch(`/api/wards/${wardId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}
