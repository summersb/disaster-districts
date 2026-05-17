import { zodResolver } from '@hookform/resolvers/zod'
import type React from 'react'
import { useEffect, useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import SaveButton from '@/components/styled/SaveButton.tsx'
import { Form } from '@/components/ui/form'
import { useDistrict } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
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
  const wardId = getWardId()

  const form = useForm<DistrictDto>({
    resolver: zodResolver(DistrictSchema) as unknown as
      | import('react-hook-form').Resolver<DistrictDto, any>
      | undefined,
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
      const db = data as any
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
      const res = await fetch(`/api/wards/${wardId}/districts/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
    } catch (err: any) {
      form.setError('name', {
        type: 'custom',
        message: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  if (Object.keys(form.formState.errors).length > 0) {
    console.log('errors', form.formState.errors)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full rounded p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          {readOnly ? 'View District' : 'Edit District'}
        </h2>

        {data && (
          <Form {...form}>
            <form
              action="#"
              onSubmit={form.handleSubmit(onSubmit)}
              method="POST"
            >
              <DistrictForm districtId={districtId} readOnly={readOnly} />

              {!readOnly && (
                <div className="text-gray-700 mb-4">
                  <SaveButton
                    saving={saving}
                    name="Save"
                    disableName="Saving"
                  />
                </div>
              )}
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}

export default EditDistrict
