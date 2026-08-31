import { useQuery } from '@tanstack/react-query'
import type { WardDto } from '@/type/Ward.ts'

const loadWards = async () => {
  const res = await fetch('/api/wards')
  return await res.json()
}

const loadWard = async (wardId: number) => {
  const res = await fetch(`/api/wards/${wardId}`)
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
