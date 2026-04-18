import StyledButton from '@/components/styled/StyledButton.tsx'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useAddMember,
  useDeleteMember,
  useMembers,
  useSaveMember,
} from '@/hooks/useMembers'
import { genId } from '@/lib/utils'
import UploadCsv from '@/pages/members/UploadCsv.tsx'
import UploadPdf from '@/pages/members/UploadPdf.tsx'
import type { Member } from '@/type'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import ImportDirectoryList from './ImportDirectoryList'
import MembersUpdate from './MembersUpdate'
import UploadMembersDetail from './UploadMembersDetail'
import { parseData } from './process.ts'

type FormType = {
  data: string
  people?: Member[]
}

const UploadMembers = (): React.ReactElement => {
  const queryClient = useQueryClient()
  const form = useForm<FormType>()
  const [members, setMembers] = useState<Member[]>()

  const { data: dbMemberList } = useMembers(0 as any)

  const addMember = useAddMember()
  const saveMemberHook = useSaveMember()

  const onSubmit = (data: FormType) => {
    const parsedPersons = parseData(data.data)
    setMembers(parsedPersons as Member[])
    form.setValue('people', parsedPersons)
  }

  // compare data with members
  // create three lists
  type Changed = {
    old: Member
    updated: Member
  }

  let newMembers: Member[] = []
  //  const existingMembers: Member[] = []
  let removedMembers: Member[] = []
  let changedMembers: Changed[] = []

  if (members && members.length > 0 && dbMemberList) {
    members.forEach((m: Member) => {
      const found = dbMemberList.find((old) => {
        return (
          (old.familyName === m.familyName && old.name === m.name) ||
          (old.familyName === m.familyName && old.address1 === m.address1)
        )
      })
      if (found) {
        if (found.address1 === m.address1) {
          //        existingMembers.push(m)
        } else {
          changedMembers.push({ old: found, updated: m })
        }
      } else {
        console.log('Did not match member', m.familyName, m.name)
        // id type is being normalized elsewhere; cast to any for now
        ;(m as any).id = genId()
        newMembers.push(m)
      }
    })
    dbMemberList.forEach((dbMember) => {
      const found = members.find(
        (uploadedMember) =>
          uploadedMember.familyName === dbMember.familyName &&
          uploadedMember.name === dbMember.name,
      )
      if (!found) {
        removedMembers.push(dbMember)
      }
    })
  }

  const deleteMemberHook = useDeleteMember()

  const updateMembers = () => {
    changedMembers?.forEach((m) => {
      const updatedMember: Member = {
        id: m.old.id,
        familyName: m.updated.familyName,
        name: m.updated.name,
        formattedAddress: m.old.formattedAddress,
        address1: m.updated.address1,
        address2: m.updated.address2,
        city: m.updated.city,
        state: m.updated.state,
        phone: m.old.phone,
        lat: m.updated.lat,
        lng: m.updated.lng,
        postalCode: m.updated.postalCode,
      }

      saveMemberHook
        .mutateAsync({
          wardId: 0,
          memberId: Number(updatedMember.id),
          member: updatedMember as any,
        })
        .catch((err) => {
          console.error(err, m)
        })
    })
    queryClient.invalidateQueries({ queryKey: ['members'] })
    changedMembers = []
  }

  const insertNewMembers = async () => {
    if (newMembers?.length) {
      // create each new member via hook so cache invalidation is handled
      await Promise.all(
        newMembers.map((m) =>
          addMember.mutateAsync({ wardId: 0, member: m as any }),
        ),
      ).catch((err) => console.error('Error creating new members', err))
    }
    queryClient.invalidateQueries({ queryKey: ['members'] })
    newMembers = []
  }

  const deleteMembers = async () => {
    const ids = removedMembers.map((m) => m.id)
    for (const id of ids) {
      try {
        await deleteMemberHook.mutateAsync({ wardId: 0, memberId: Number(id) })
      } catch (err) {
        console.error('Failed to delete member', id, err)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['members'] })
    removedMembers = []
  }

  return (
    <div className="p-4">
      <div className="text-xl flex justify-around">Upload Members</div>
      {(members?.length ?? 0) === 0 && (
        <div className="flex justify-start">
          <Tabs defaultValue="pdf" className="w-full">
            <TabsList className="grid w-fill grid-cols-3">
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="web">Web</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="pdf">
              <UploadPdf setMembers={setMembers} />
            </TabsContent>
            <TabsContent value="web">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} method="POST">
                  <ImportDirectoryList />
                  <StyledButton type="submit">Process</StyledButton>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="csv">
              <UploadCsv setMembers={setMembers} />
            </TabsContent>
          </Tabs>
        </div>
      )}
      {(newMembers?.length > 0 ||
        changedMembers?.length > 0 ||
        deleteMembers?.length > 0) && (
        <Tabs defaultValue="new" className="w-full mt-10 mb-10">
          <TabsList className="grid w-fill grid-cols-3">
            <TabsTrigger value="new">New Members</TabsTrigger>
            <TabsTrigger value="update">Changed Members</TabsTrigger>
            <TabsTrigger value="delete">Deleted Members</TabsTrigger>
          </TabsList>
          <TabsContent value="new">
            {(newMembers.length ?? 0) > 0 && (
              <>
                New members
                <UploadMembersDetail members={newMembers} />
                <StyledButton onClick={insertNewMembers}>Insert</StyledButton>
              </>
            )}
          </TabsContent>
          <TabsContent value="update">
            {(changedMembers.length ?? 0) > 0 && (
              <>
                Changed Members
                <MembersUpdate members={changedMembers} />
                <StyledButton onClick={updateMembers}>Update</StyledButton>
              </>
            )}
          </TabsContent>
          <TabsContent value="delete">
            {(removedMembers.length ?? 0) > 0 && (
              <>
                Removed Members
                <UploadMembersDetail members={removedMembers} />
                <StyledButton onClick={deleteMembers}>Delete</StyledButton>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
      {(members?.length ?? 0) > 0 && (
        <StyledButton onClick={() => setMembers([])}>Cancel</StyledButton>
      )}
    </div>
  )
}

export default UploadMembers
