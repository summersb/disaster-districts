import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DistrictDto } from '@/type'

const loadDistricts = async (wardId: number): Promise<DistrictDto[]> => {
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
): Promise<DistrictDto> => {
  const res = await fetch(`/api/wards/${wardId}/districts/${districtId}`)
  if (!res.ok) {
    throw new Error(`Failed to load district ${districtId}: ${res.status}`)
  }
  const json = await res.json()
  return json
}

export const useDistricts = (wardId: number) =>
  useQuery<DistrictDto[]>({
    queryKey: ['districts', wardId],
    queryFn: () => loadDistricts(wardId),
  })

export const useDistrict = (wardId: number, districtId: number) =>
  useQuery<DistrictDto>({
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
      fetch(
        `/api/wards/${wardId}/districts/${districtId}/members/${memberId}`,
        {
          method: 'POST',
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['districts'] })
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
      queryClient.invalidateQueries({ queryKey: ['districts'] })
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
      district: DistrictDto
    }) =>
      fetch(`/api/wards/${wardId}/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(district),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['districts'] })
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
      queryClient.invalidateQueries({ queryKey: ['districts'] })
    },
  })
}
