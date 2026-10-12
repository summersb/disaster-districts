import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FormProvider, type Resolver, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import useUser from '@/context/useUser.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers, useSaveMember } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { canManageUsers } from '@/lib/roles'
import { Route as MemberRoute } from '@/routes/_protected/member/index'
import type { MemberDto } from '@/type'
import { MemberSchema } from '@/type'
import MemberForm, { type MemberFormAccess } from './MemberForm'

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
  const { user } = useUser()
  const { data: districts = [] } = useDistricts(wardId)

  // Ward admins edit everything. The leader or assistant of the member's
  // district can change the contact details only; everyone else just reads.
  // (The server enforces the same rules - this only shapes the form.)
  const leadsMembersDistrict =
    user.memberId != null &&
    member?.district?.id != null &&
    districts.some(
      (d) =>
        d.id === member.district?.id &&
        (d.leaderId === user.memberId || d.assistantId === user.memberId),
    )
  const access: MemberFormAccess = canManageUsers(user.roles)
    ? 'all'
    : leadsMembersDistrict
      ? 'contact'
      : 'none'

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

  // Save stays disabled until the user changes something. dirtyFields rather
  // than isDirty: isDirty is already true on a blank form, because fields
  // with no default value count as differing from the defaults.
  const isDirty = Object.keys(form.formState.dirtyFields).length > 0

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {access === 'none' ? 'Member' : 'Edit Member'}
      </h1>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {access === 'contact' && (
            <p className="text-sm text-muted-foreground">
              As this member's district leader you can update their address,
              phone and notes.
            </p>
          )}
          {access === 'none' && (
            <p className="text-sm text-muted-foreground">
              Only ward admins, or the leader of this member's district, can
              change these details.
            </p>
          )}
          <MemberForm access={access} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saveMember.isPending}
              onClick={() => navigate({ to: MemberRoute.to })}
            >
              Cancel
            </Button>
            {access !== 'none' && (
              <Button type="submit" disabled={saveMember.isPending || !isDirty}>
                {saveMember.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

export default EditMember
