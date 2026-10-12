import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useState } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { authFetch, getWardId } from '@/lib/api'
import { Route as DistrictsRoute } from '@/routes/_protected/district/index'
import type { DistrictDto } from '@/type'
import { DistrictSchema } from '@/type'
import DistrictForm from './DistrictForm'

const AddDistrict = (): React.ReactElement => {
  const [saving, setSaving] = useState<boolean>(false)
  const navigate = useNavigate()
  const wardId = getWardId()

  const form = useForm<DistrictDto>({
    resolver: zodResolver(DistrictSchema) as unknown as Resolver<DistrictDto>,
    defaultValues: {
      id: 0,
      name: '',
      members: [],
    },
  })

  const onSubmit: SubmitHandler<DistrictDto> = async (data) => {
    setSaving(true)
    const body = {
      name: data.name,
      color: data.color,
      lat: data.lat,
      lng: data.lng,
      leaderId: data.leader?.id ?? 0,
      assistantId: data.assistant?.id ?? 0,
      memberIds: (data.members ?? []).map((m) => m.id),
    }

    try {
      const res = await authFetch(`/api/wards/${wardId}/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      await navigate({ to: DistrictsRoute.to })
    } catch (err) {
      form.setError('name', {
        type: 'custom',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setSaving(false)
    }
  }

  // Save stays disabled until the user changes something. dirtyFields rather
  // than isDirty: isDirty is already true on a blank form, because fields
  // with no default value count as differing from the defaults.
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0

  return (
    // Fills the page height so the map can take all the space under the title.
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-semibold mb-4">Add District</h2>

      <Form {...form}>
        <form
          action="#"
          onSubmit={form.handleSubmit(onSubmit)}
          method="POST"
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <DistrictForm districtId={0} />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => navigate({ to: DistrictsRoute.to })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default AddDistrict
