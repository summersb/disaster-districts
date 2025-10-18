import { useQuery } from '@tanstack/react-query'
import { Ward } from '@/type/Ward.ts'

const loadWards = async () => {
  const res = await fetch(`/api/wards`)
  const json = await res.json()
  return json
}

const loadWard = async (wardId: number) => {
  const res = await fetch(`/api/wards/${wardId}`)
  const json = await res.json()
  return json
}

export const useWards = () => {
  return useQuery<Ward[]>({
    queryKey: ['wards'],
    queryFn: loadWards
  })
}

export const useWard = async (wardId: number) => {
  return useQuery<Ward>({
    queryKey: ['ward', wardId],
    queryFn: () => loadWard(wardId),
  })
}