import React, { useState } from 'react'
import {
  createWard,
  getWardList,
  savePermissions,
  saveWardList,
} from '@/api/wardApi.ts'
import { saveMemberList } from '@/api'
import { saveDistrictList } from '@/api/districtApi.ts'
import useAuth from '@/hooks/useAuth.tsx'
import { DistrictDbType, Member } from '@/type'
import { UserRoles } from '@/type/User.ts'
import StyledButton from '@/components/styled/StyledButton.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { WardConfig } from '@/type/Ward.ts'

type WardDoc = {
  id: string
  name: string
  members: Member[]
  districts: DistrictDbType[]
  permissions: UserRoles
}

const UploadWard = (): React.ReactElement => {
  const [file, setFile] = useState<File | null>()
  const { user } = useAuth()
  const fileReader = new FileReader()
  const [, setActiveWard] = useLocalStorageState<WardConfig>('ward', undefined)

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0])
  }

  const handleOnSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault()

    if (file) {
      fileReader.onload = async function (event) {
        const text = event.target?.result
        if (text) {
          try {
            const wardData: WardDoc = JSON.parse(text as string)
            const wardList = await getWardList()
            await saveWardList([
              ...(wardList || []),
              { wardName: wardData.name },
            ])
            await createWard(wardData.name, user)
            setActiveWard({ wardName: wardData.name })
            console.log('Created ward', wardData.name)
            await savePermissions(wardData.name, wardData.permissions)
            console.log('Added permissions', wardData.permissions)
            const members = await saveMemberList(wardData.members)
            console.log('Added members', wardData.members, members)
            const dist = await saveDistrictList(wardData.districts)
            console.log('Added districts', wardData.districts, dist)
          } catch (e) {
            console.error(e)
          }
        }
      }

      fileReader.readAsText(file)
    }
  }

  return (
    <form>
      <input
        type="file"
        id="wardimport"
        accept=".json"
        onChange={handleOnChange}
        className="mb-4 p-2 border rounded-md bg-gray-700 text-white"
      />

      <StyledButton onClick={handleOnSubmit}>Import Ward</StyledButton>
    </form>
  )
}

export default UploadWard
