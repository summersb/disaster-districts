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

export type MemberImportResult = {
  index: number
  status: 'created' | 'skipped' | 'failed'
  id?: number | null
  error?: string | null
}

export type MemberImportResponse = {
  created: number
  skipped: number
  failed: number
  results: MemberImportResult[]
}

// Creates many members in one request. The server answers 207 with a result
// per member (matched by `index` into the submitted array), so a partial
// failure still resolves - only a request-level failure throws.
export const useImportMembers = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      wardId,
      members,
    }: {
      wardId: number
      members: MemberDto[]
    }): Promise<MemberImportResponse> => {
      const res = await authFetch(`/api/wards/${wardId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(members),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSettled: () => {
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
