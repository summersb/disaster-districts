import { useQuery } from '@tanstack/react-query'
import { Ward } from '@/type/Ward.ts'

const loadUser = async (wardId: number) => {
  const res = await fetch(`/api/user/${wardId}`)
  return await res.json()
}

export const useWard = async (user: number) => {
  return useQuery<Ward>({
    queryKey: ['user', user],
    queryFn: () => loadUser(user),
  })
}
