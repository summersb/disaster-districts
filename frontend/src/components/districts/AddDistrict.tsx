import { zodResolver } from '@hookform/resolvers/zod'
import type React from 'react'
import { useState } from 'react'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import SaveButton from '@/components/styled/SaveButton.tsx'
import { Form } from '@/components/ui/form'
import { getWardId } from '@/lib/api'
import type { DistrictDto } from '@/type'
import { DistrictSchema } from '@/type'
import DistrictForm from './DistrictForm'
import { Route } from '@/routes/_protected/district/index'

const AddDistrict = (): React.ReactElement => {
  const [saving, setSaving] = useState<boolean>(false)
  const navigate = useNavigate()
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
      const res = await fetch(`/api/wards/${wardId}/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      await navigate({ to: Route.to })
    } catch (err: any) {
      form.setError('name', {
        type: 'custom',
        message: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full rounded p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Add District</h2>

        <Form {...form}>
          <form
            action="#"
            onSubmit={form.handleSubmit(onSubmit)}
            method="POST"
          >
            <DistrictForm districtId={0} />

            <div className="text-gray-700 mb-4">
              <SaveButton
                saving={saving}
                name="Save"
                disableName="Saving"
              />
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default AddDistrict
