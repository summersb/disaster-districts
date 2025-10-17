import { Form } from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SubmitHandler, useForm } from 'react-hook-form'
import type { District, DistrictDbType } from '@/type'
import { DistrictSchema } from '@/type'
import React, { useEffect, useState } from 'react'
import { saveDistrict, getDistrict, getMemberList } from '@/api'
import DistrictForm from './DistrictForm'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import SaveButton from '@/components/styled/SaveButton.tsx'

const EditDistrict = (): React.ReactElement => {
  const [saving, setSaving] = useState<boolean>(false)
  const { districtId } = useParams()

  const form = useForm<District>({
    resolver: zodResolver(DistrictSchema),
    defaultValues: {
      id: 'pending',
      name: '',
      members: [],
    },
  })

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const convertDbDistrict = (): Promise<District> =>
    getDistrict(districtId as string).then((db: DistrictDbType) => {
      return {
        id: db.id,
        name: db.name,
        leader: members?.find((m) => m.id == db.leaderId),
        assistant: members?.find((m) => m.id == db.assistantId),
        color: db.color,
        members: members
          ?.filter((m) => db.members?.includes(m.id))
          .sort((m1, m2) => m1.familyName.localeCompare(m2.familyName)),
      } as District
    })

  const { data } = useQuery({
    queryKey: ['district', districtId],
    queryFn: convertDbDistrict,
    enabled: districtId != null && members !== undefined,
    retry: false,
  })

  useEffect(() => {
    if (data) {
      form.reset(data)
    }
  }, [data, form])

  const onSubmit: SubmitHandler<District> = async (data) => {
    setSaving(true)
    const dbDistrict: DistrictDbType = {
      id: data.id,
      name: data.name,
      leaderId: data.leader?.id,
      assistantId: data.assistant?.id,
      color: data.color,
      members: data.members?.map((m) => m.id) ?? [],
    }
    dbDistrict.assistantId = data?.assistant?.id ?? undefined
    saveDistrict(dbDistrict)
      .then((d) => {
        console.log('created', d)
      })
      .catch((err: Error) => {
        form.setError('name', {
          type: 'custom',
          message: err.message,
        })
      })
      .finally(() => {
        setSaving(false)
      })
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
              <DistrictForm districtId={districtId as string} />

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
