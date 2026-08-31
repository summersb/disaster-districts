import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { MemberDto } from '@/type'

const loadMembers = async (wardId: number): Promise<MemberDto[]> => {
  const res = await authFetch(`/api/wards/${wardId}/members`)
  if (!res.ok) {
    return []
  }
  const json = await res.json()
  return Array.isArray(json) ? json : []
}

const loadMember = async (
  wardId: number,
  memberId: number,
): Promise<MemberDto> => {
  const res = await authFetch(`/api/wards/${wardId}/members/${memberId}`)
  if (!res.ok) throw new Error(`Failed to load member ${memberId}`)
  return res.json()
}

export const useMembers = (wardId: number) =>
  useQuery<MemberDto[]>({
    queryKey: ['members', wardId],
    queryFn: () => loadMembers(wardId),
  })

export const useMember = (wardId: number, memberId: number | undefined) =>
  useQuery<MemberDto>({
    queryKey: ['member', wardId, memberId],
    queryFn: () => loadMember(wardId, memberId as number),
    enabled: memberId !== undefined,
  })

export const useAddMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wardId, member }: { wardId: number; member: MemberDto }) =>
      authFetch(`/api/wards/${wardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
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
    }: {
      wardId: number
      memberId: number
      member: MemberDto
    }) =>
      authFetch(`/api/wards/${wardId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export const useDeleteMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wardId, memberId }: { wardId: number; memberId: number }) =>
      authFetch(`/api/wards/${wardId}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
