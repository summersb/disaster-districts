import type { Member } from '@/type'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const loadMembers = async (wardId: number): Promise<Member[]> => {
  const res = await fetch(`/api/wards/${wardId}/members`)
  if (!res.ok) {
    return []
  }
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

const loadMember = async (wardId: number, memberId: number): Promise<Member> => {
  const res = await fetch(`/api/wards/${wardId}/members/${memberId}`)
  if (!res.ok) throw new Error(`Failed to load member ${memberId}`)
  return res.json()
}

export const useMembers = (wardId: number) =>
  useQuery<Member[]>({
    queryKey: ['members', wardId],
    queryFn: () => loadMembers(wardId),
  })

export const useMember = (wardId: number, memberId: number | undefined) =>
  useQuery<Member>({
    queryKey: ['member', wardId, memberId],
    queryFn: () => loadMember(wardId, memberId as number),
    enabled: memberId !== undefined,
  })

export const useAddMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wardId, member }: { wardId: number; member: Member }) =>
      fetch(`/api/wards/${wardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export const useSaveMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wardId,
      memberId,
      member,
    }: { wardId: number; memberId: number; member: Member }) =>
      fetch(`/api/wards/${wardId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export const useDeleteMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wardId, memberId }: { wardId: number; memberId: number }) =>
      fetch(`/api/wards/${wardId}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['members'] })
    },
  })
}
