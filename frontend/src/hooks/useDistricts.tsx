import type { District } from '@/type'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const loadDistricts = async (wardId: number): Promise<District[]> => {
  const res = await fetch(`/api/wards/${wardId}/districts`)
  if (!res.ok) {
    throw new Error(`Failed to load districts: ${res.status}`)
  }
  const json = await res.json()
  return json
}

const loadDistrict = async (
  wardId: number,
  districtId: number,
): Promise<District> => {
  const res = await fetch(`/api/wards/${wardId}/districts/${districtId}`)
  if (!res.ok) {
    throw new Error(`Failed to load district ${districtId}: ${res.status}`)
  }
  const json = await res.json()
  return json
}

export const useDistricts = (wardId: number) =>
  useQuery<District[]>({
    queryKey: ['districts', wardId],
    queryFn: () => loadDistricts(wardId),
  })

export const useDistrict = (wardId: number, districtId: number) =>
  useQuery<District>({
    queryKey: ['district', wardId, districtId],
    queryFn: () => loadDistrict(wardId, districtId),
  })

export const useAddDistrictMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wardId,
      districtId,
      memberId,
    }: {
      wardId: number
      districtId: number
      memberId: number
    }) =>
      fetch(`/api/wards/${wardId}/district/${districtId}/members/${memberId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['districts'] })
    },
  })
}

export const useDeleteDistrictMember = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wardId,
      districtId,
      memberId,
    }: {
      wardId: number
      districtId: number
      memberId: number
    }) =>
      fetch(
        `/api/wards/${wardId}/districts/${districtId}/members/${memberId}`,
        {
          method: 'DELETE',
        },
      ),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['districts'] })
    },
  })
}

export const useAddDistrict = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wardId,
      district,
    }: {
      wardId: number
      district: District
    }) =>
      fetch(`/api/wards/${wardId}/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(district),
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['districts'] })
    },
  })
}

export const useDeleteDistrict = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      wardId,
      districtId,
    }: {
      wardId: number
      districtId: number
    }) =>
      fetch(`/api/wards/${wardId}/districts/${districtId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ['districts'] })
    },
  })
}
