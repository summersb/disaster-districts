import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useAddMember } from '@/hooks/useMembers'
import { genId } from '@/lib/utils'
import { getGeo } from '@/pages/members/process.ts'
import type { Member } from '@/type'
import { MemberSchema } from '@/type'
import { zodResolver } from '@hookform/resolvers/zod'
import { type SubmitHandler, useForm } from 'react-hook-form'
import MemberForm from './MemberForm'

export default function AddMember() {
  const form = useForm<Member>({
    resolver: zodResolver(MemberSchema) as unknown as
      | import('react-hook-form').Resolver<Member, any>
      | undefined,
    defaultValues: {
      id: genId(),
      familyName: '',
      name: '',
      formattedAddress: '',
      phone: undefined,
      address1: undefined,
      address2: undefined,
      city: 'Vista',
      state: 'CA',
      postalCode: undefined,
      lat: undefined,
      lng: undefined,
    },
  })

  const createMember = useAddMember()

  const onSubmit: SubmitHandler<Member> = async (data) => {
    const m = await getGeo(data)
    try {
      await createMember.mutateAsync({ wardId: 0, member: m } as any)
      form.reset()
    } catch (e) {
      console.error('Create member failed', e)
    }
  }

  if (Object.keys(form.formState.errors).length > 0) {
    console.log('errors', form.formState.errors)
  }

  return (
    <>
      <div className="text-xl flex justify-around">Add Member</div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-2/3 space-y-6"
        >
          <MemberForm />
          <Button
            variant="outline"
            disabled={form.formState.isSubmitting}
            type="submit"
          >
            Add Member
          </Button>
        </form>
      </Form>
    </>
  )
}
