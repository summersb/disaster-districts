import { useState } from 'react'
import type React from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import MemberForm from './MemberForm'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { MemberSchema } from '@/type'
import type { MemberDto } from '@/type'

type EditMemberProps = {
  memberId: number
}

const EditMember = ({ memberId }: EditMemberProps): React.ReactElement => {
  const wardId = getWardId()
  const { data: members } = useMembers(wardId)
  const [saving, setSaving] = useState(false)
  const member = members?.find((m) => m.id === memberId)

  const form = useForm<MemberDto>({
    resolver: zodResolver(MemberSchema) as unknown as any,
    defaultValues: member || {},
  })

  const onSubmit = async (data: MemberDto) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch (err: any) {
      form.setError('name', { message: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Member</h1>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <MemberForm />
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </FormProvider>
    </div>
  )
}

export default EditMember
