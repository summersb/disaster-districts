import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useEffect, useState } from 'react'
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useDistrict } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { authFetch, getWardId } from '@/lib/api'
import { Route as DistrictsRoute } from '@/routes/_protected/district/index'
import type { DistrictDto } from '@/type'
import { DistrictSchema } from '@/type'
import DistrictForm from './DistrictForm'

type EditDistrictProps = {
  districtId: number
  readOnly?: boolean
}

const EditDistrict = ({
  districtId,
  readOnly = false,
}: EditDistrictProps): React.ReactElement => {
  const [saving, setSaving] = useState<boolean>(false)
  const [formReady, setFormReady] = useState<boolean>(false)
  const wardId = getWardId()
  const navigate = useNavigate()

  const form = useForm<DistrictDto>({
    resolver: zodResolver(DistrictSchema) as unknown as Resolver<DistrictDto>,
    defaultValues: {
      id: 0,
      name: '',
      members: [],
    },
  })

  const { data: members } = useMembers(wardId)
  const { data } = useDistrict(wardId, Number(districtId))

  useEffect(() => {
    if (data && members) {
      // convert db district shape to form District shape
      const db = data
      // The map and the ColorPicker key off color *names* that match SVG
      // filenames in /public/images (e.g. Blue.svg). Legacy rows may have a
      // hex value stored — normalize those to a sensible default so the
      // picker has something to select and the marker has an icon.
      const knownColorNames = [
        'Red',
        'Green',
        'Blue',
        'Pink',
        'Orange',
        'Cyan',
        'Dark Red',
        'Purple',
        'Yellow',
        'Lime',
        'Indigo',
        'Violet',
        'Teal',
        'Bright Red',
        'Scarlet',
        'Sky Blue',
        'Dark Orange',
        'Light Green',
        'Magenta',
        'Bright Green',
      ]
      const color = knownColorNames.includes(db.color) ? db.color : 'Blue'
      const district: DistrictDto = {
        id: db.id,
        name: db.name,
        leader: members.find((m) => m.id === db.leaderId),
        assistant: members.find((m) => m.id === db.assistantId),
        color,
        lat: db.lat,
        lng: db.lng,
        leaderId: db.leaderId ?? null,
        assistantId: db.assistantId ?? null,
        members: (members ?? []).filter((m) => m.district?.id === db.id),
      }
      form.reset(district)
      setFormReady(true)
    }
  }, [data?.id, members?.length, data, members, form.reset])

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
      const res = await authFetch(`/api/wards/${wardId}/districts/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    } catch (err) {
      form.setError('name', {
        type: 'custom',
        message: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setSaving(false)
    }
  }

  if (Object.keys(form.formState.errors).length > 0) {
    console.log('errors', form.formState.errors)
  }

  // Save stays disabled until the user changes something. dirtyFields rather
  // than isDirty: isDirty is already true on a blank form, because fields
  // with no default value count as differing from the defaults.
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0

  return (
    // Fills the page height so the map can take all the space under the title.
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-semibold mb-4">
        {readOnly ? 'View District' : 'Edit District'}
      </h2>

      {data && !formReady && (
        <p className="text-sm text-muted-foreground">Loading district…</p>
      )}

      {data && formReady && (
        <Form {...form}>
          <form
            action="#"
            onSubmit={form.handleSubmit(onSubmit)}
            method="POST"
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <DistrictForm districtId={districtId} readOnly={readOnly} />

            {!readOnly && (
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
            )}
          </form>
        </Form>
      )}
    </div>
  )
}

export default EditDistrict
