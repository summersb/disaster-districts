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

  // Save stays disabled until the user changes something. dirtyFields rather
  // than isDirty: isDirty is already true on a blank form, because fields
  // with no default value count as differing from the defaults.
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Add Member</h1>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <MemberForm />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={addMember.isPending}
              onClick={() => navigate({ to: MemberRoute.to })}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending || !isDirty}>
              {addMember.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default AddMember
