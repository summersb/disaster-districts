import {Button} from '@/components/ui/button'
import {Form} from '@/components/ui/form'
import {zodResolver} from '@hookform/resolvers/zod'
import {SubmitHandler, useForm} from 'react-hook-form'
import {saveMember} from '@/api'
import type {Member} from '@/type'
import {MemberSchema} from '@/type'
import MemberForm from './MemberForm'
import {getGeo} from "@/pages/members/process.ts";

export default function AddMember() {

  const form = useForm<Member>({
    resolver: zodResolver(MemberSchema),
    defaultValues: {
      id: crypto.randomUUID(),
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
    }
  })

  const onSubmit: SubmitHandler<Member> = async (data) => {
    const m = await getGeo(data)
    // save to firestore
    await saveMember(m)
    form.reset()
  }

  if (Object.keys(form.formState.errors).length > 0) {
    console.log("errors", form.formState.errors)
  }


  return (
    <>
      <div className="text-xl flex justify-around">Add Member</div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-2/3 space-y-6"
        >
          <MemberForm/>
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
