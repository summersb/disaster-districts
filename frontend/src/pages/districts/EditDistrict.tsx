import { Form } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import type { District } from '@/type'
import { DistrictSchema } from '@/type'
import React, { useEffect, useState } from 'react'
import { useDistrict } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import DistrictForm from './DistrictForm'

import { useMatch } from '@tanstack/react-router'
import { editDistrictRoute } from '@/routes'
import SaveButton from '@/components/styled/SaveButton.tsx'

const EditDistrict = (): React.ReactElement => {
  const [saving, setSaving] = useState<boolean>(false)
  const match = useMatch({ from: editDistrictRoute })
  const districtId = Number(match?.params?.districtId)

  const form = useForm<District>({
    resolver: zodResolver(DistrictSchema) as unknown as
      | import('react-hook-form').Resolver<District, any>
      | undefined,
    defaultValues: {
      id: 0,
      name: '',
      members: [],
    },
  })

  const { data: members } = useMembers(0 as any)
  const { data } = useDistrict(0 as any, Number(districtId))

  useEffect(() => {
    if (data && members) {
      // convert db district shape to form District shape
      const db = data as any
      const district: District = {
        id: db.id,
        name: db.name,
        leader: members.find((m) => m.id === db.leaderId) ?? ({} as any),
        assistant: members.find((m) => m.id === db.assistantId) ?? undefined,
        color: db.color,
        members: (members ?? []).filter((m) => db.members?.includes(m.id)),
      }
      form.reset(district)
    }
  }, [data, form])

  const onSubmit: SubmitHandler<District> = async (data) => {
    setSaving(true)
    type DistrictDbType = {
      id: number
      name: string
      leaderId?: number
      assistantId?: number
      color?: string
      members?: number[]
    }

    const dbDistrict: DistrictDbType = {
      id: data.id,
      name: data.name,
      leaderId: data.leader?.id,
      assistantId: data.assistant?.id,
      color: data.color,
      members: data.members?.map((m) => m.id) ?? [],
    }
    dbDistrict.assistantId = data?.assistant?.id ?? undefined

    try {
      await fetch(`/api/wards/0/district/${dbDistrict.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbDistrict),
      })
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
        <h2 className="text-xl font-semibold mb-4">Edit District</h2>

        {data && (
          <Form {...form}>
            <form
              action="#"
              onSubmit={form.handleSubmit(onSubmit)}
              method="POST"
            >
              <DistrictForm districtId={districtId} />

              <div className="text-gray-700 mb-4">
                <SaveButton saving={saving} name="Save" disableName="Saving" />
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}

export default EditDistrict
