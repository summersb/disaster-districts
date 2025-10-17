import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { SubmitHandler, useForm } from 'react-hook-form'
import { getMember, saveMember } from '@/api'
import { MemberSchema } from '@/type'
import type { Member } from '@/type'
import MemberForm from './MemberForm'
import { getGeo } from '@/pages/members/process.ts'
import StyledButton from '@/components/styled/StyledButton.tsx'

const EditMember = () => {
  const { memberId } = useParams()
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => getMember(memberId as string),
    enabled: memberId !== undefined,
    retry: false,
  })

  const form = useForm({
    resolver: zodResolver(MemberSchema),
    values: data || {},
  })

  const [error, setError] = useState<string>()

  const onSubmit: SubmitHandler<Partial<Member>> = async (
    data: Partial<Member>,
  ) => {
    const m = await getGeo(data)
    saveMember(m as Member)
      .then(() => {
        navigate('/members')
      })
      .catch((e: Error) => {
        saveMember(data).then(() => {
          navigate('/members')
        })
        setError(e.message)
      })
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
