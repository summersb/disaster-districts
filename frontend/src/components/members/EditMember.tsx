import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FormProvider, type Resolver, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useMembers, useSaveMember } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { Route as MemberRoute } from '@/routes/_protected/member/index'
import type { MemberDto } from '@/type'
import { MemberSchema } from '@/type'
import MemberForm from './MemberForm'

type EditMemberProps = {
  memberId: number
}

const EditMember = ({ memberId }: EditMemberProps): React.ReactElement => {
  const wardId = getWardId()
  const navigate = useNavigate()
  const { data: members } = useMembers(wardId)
  const saveMember = useSaveMember()
  const [error, setError] = useState('')
  const member = members?.find((m) => m.id === memberId)

  const form = useForm<MemberDto>({
    resolver: zodResolver(MemberSchema) as unknown as Resolver<MemberDto>,
    defaultValues: member || {},
  })

  // members loads asynchronously, so the form's initial defaultValues can be
  // empty on a direct navigation/refresh - reset once the real data arrives.
  useEffect(() => {
    if (member) form.reset(member)
  }, [member, form.reset])

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
      const res = await saveMember.mutateAsync({
        wardId,
        memberId,
        member: { ...data, formattedAddress },
      })
      if (!res.ok) throw new Error('Failed to save member')
      await navigate({ to: MemberRoute.to })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Member</h1>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <MemberForm />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saveMember.isPending}>
            {saveMember.isPending ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </FormProvider>
    </div>
  )
}

export default EditMember
