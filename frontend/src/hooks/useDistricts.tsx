import { useQuery } from '@tanstack/react-query'
import { Member } from '@/type'

const loadMembers = async (wardId: number) => {
    const res = await fetch(`/api/wards/${wardId}/members`)
    const json = await res.json()
    return json
  }

const loadMember = async (wardId: number, memberId: number) => {
  const res = await fetch(`/api/wards/${wardId}/members/${memberId}`)
  const json = await res.json()
  return json
}

export const useMembers = (wardId: number) =>
  useQuery<Member[]>({
    queryKey: ['members', wardId],
    queryFn: () => loadMembers(wardId)
  })

export const useMember = async (wardId: number, memberId: number) =>
  useQuery<Member>({
    queryKey: ['member', wardId, memberId],
    queryFn: () => loadMember(wardId, memberId)
  })