import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useState } from 'react'
import { FormProvider, type Resolver, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useAddMember } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { Route as MemberRoute } from '@/routes/_protected/member/index'
import type { MemberDto } from '@/type'
import { MemberSchema } from '@/type'
import MemberForm from './MemberForm'

const AddMember = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const addMember = useAddMember()
  const [error, setError] = useState('')

  const form = useForm<MemberDto>({
    resolver: zodResolver(MemberSchema) as unknown as Resolver<MemberDto>,
    defaultValues: { id: 0 },
  })

  const onSubmit = async (data: MemberDto) => {
    setError('')
    // formattedAddress has no field of its own in MemberForm but is
    // required by the backend - derive it from the address parts.
    const formattedAddress = [
      data.address1,
      data.city,
      [data.state, data.postalCode].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ')

    try {
      const res = await addMember.mutateAsync({
        wardId,
        member: { ...data, formattedAddress },
      })
      if (!res.ok) throw new Error('Failed to add member')
      await navigate({ to: MemberRoute.to })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Add Member</h1>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <MemberForm />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </FormProvider>
    </div>
  )
}

export default AddMember
