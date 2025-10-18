import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
        .catch((e) => console.log('Error ' + e))
    },
    onError: (e) => console.log('Error ' + e),
  })
}

export const useSaveMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ wardId, memberId, member }: { wardId: number; memberId: number; member: Member }) =>
      fetch(`/api/wards/${wardId}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['members'] })
        .catch((e) => console.log('Error ' + e))
    },
    onError: (e) => console.log('Error ' + e),
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
        .catch((e) => console.log('Error ' + e))
    },
    onError: (e) => console.log('Error ' + e),
  })
}
