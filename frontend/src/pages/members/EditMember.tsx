import React, { useState } from 'react'
import { Link, useNavigate, useMatch } from '@tanstack/react-router'
import { editMemberRoute } from '@/routes'
// no direct useQuery here; we use useMember hook
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useMember, useSaveMember } from '@/hooks/useMembers'
import type { Member } from '@/type'
import { MemberSchema } from '@/type'
import MemberForm from './MemberForm'
import { getGeo } from '@/pages/members/process.ts'
import StyledButton from '@/components/styled/StyledButton.tsx'

const EditMember = () => {
  const match = useMatch({ from: editMemberRoute })
  const memberId = match?.params?.memberId
  const navigate = useNavigate()
  const { data } = useMember(0 as any, Number(memberId))

  const form = useForm<Member>({
    resolver: zodResolver(MemberSchema) as unknown as
      | import('react-hook-form').Resolver<Member, any>
      | undefined,
    defaultValues: (data ?? ({} as Member)) as Member,
  })

  // keep form in sync when data is loaded
  React.useEffect(() => {
    if (data) form.reset(data)
  }, [data, form])

  const [error, setError] = useState<string>()

  const saveMemberHook = useSaveMember()

  const onSubmit: SubmitHandler<Member> = async (data: Member) => {
    const m = await getGeo(data)
    try {
      await saveMemberHook.mutateAsync({
        wardId: 0,
        memberId: Number(data.id),
        member: m as any,
      })
      navigate({ to: '/members' })
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="text-xl flex justify-around">Edit Member</div>
      <div className="text-xl text-red-900">{error && error}</div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-2/3 space-y-6"
        >
          <MemberForm />
          <StyledButton type="submit" disabled={form.formState.isSubmitting}>
            Save
          </StyledButton>
          <Link to="/members">
            <StyledButton disabled={form.formState.isSubmitting}>
              Cancel
            </StyledButton>
          </Link>
        </form>
      </Form>
    </>
  )
}

export default EditMember
