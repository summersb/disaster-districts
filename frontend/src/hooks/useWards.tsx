import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authFetch } from '@/lib/api'
import type { WardDto } from '@/type/Ward.ts'

const loadWards = async () => {
  const res = await authFetch('/api/wards')
  return await res.json()
}

const loadWard = async (wardId: number) => {
  const res = await authFetch(`/api/wards/${wardId}`)
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

export const useCreateWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ward: { name: string }): Promise<{ id?: number }> => {
      const res = await authFetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ward),
      })
      if (!res.ok) {
        throw new Error(
          res.status === 409
            ? 'A ward with that name already exists'
            : 'Failed to create ward',
        )
      }
      const location = res.headers.get('location')
      const id = location ? Number(location.split('/').pop()) : undefined
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
    },
  })
}

export const useSaveWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      wardId,
      ward,
    }: {
      wardId: number
      // Every field is optional: the server changes only what is sent. A
      // leaderId of 0 clears the ward leader.
      ward: { name?: string; lat?: number; lng?: number; leaderId?: number }
    }) =>
      authFetch(`/api/wards/${wardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ward),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['ward', variables.wardId] })
    },
  })
}

export const useDeleteWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (wardId: number) =>
      authFetch(`/api/wards/${wardId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['wardUsers'] })
    },
  })
}

// What an imported ward file must look like at the top level; the server
// validates the rest.
export const WARD_EXPORT_FORMAT = 'disaster-districts-ward'

export type WardExportFile = {
  format: string
  version: number
  exportedAt?: string
  ward?: { name?: string }
  districts?: unknown[]
  members?: unknown[]
}

export type WardImportResult = {
  membersCreated: number
  membersUpdated: number
  districtsCreated: number
  districtsUpdated: number
}

/** Downloads the ward's settings, districts and members as one JSON document. */
export const exportWard = async (wardId: number): Promise<Blob> => {
  const res = await authFetch(`/api/wards/${wardId}/export`)
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  // Re-serialized with indentation so the file is readable in an editor.
  return new Blob([JSON.stringify(await res.json(), null, 2)], {
    type: 'application/json',
  })
}

// Merges an export file into the ward: members and districts with the same
// name are updated, new ones are added, nothing is deleted.
export const useImportWard = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      wardId,
      file,
    }: {
      wardId: number
      file: WardExportFile
    }): Promise<WardImportResult> => {
      const res = await authFetch(`/api/wards/${wardId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Import failed: ${res.status}`)
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      // An import can touch everything about the ward.
      queryClient.invalidateQueries({ queryKey: ['ward', variables.wardId] })
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['districts'] })
      queryClient.invalidateQueries({ queryKey: ['district'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
