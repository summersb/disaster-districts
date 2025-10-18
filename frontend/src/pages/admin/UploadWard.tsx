import React, { useState } from 'react'
// fallback to direct fetch calls for ward admin operations
const wardApi = {
  getWardList: async () => {
    try {
      const res = await fetch('/api/wards/list')
      return res.ok ? (await res.json()) : []
    } catch (e) {
      return []
    }
  },
  saveWardList: async (list: any[]) => {
    try {
      await fetch('/api/wards/list', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      })
    } catch (e) {
      console.warn('saveWardList failed', e)
    }
  },
  createWard: async (name: string, user: any) => {
    try {
      await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardName: name, user }),
      })
    } catch (e) {
      console.warn('createWard failed', e)
    }
  },
  savePermissions: async (name: string, perms: any) => {
    try {
      await fetch(`/api/wards/${name}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perms),
      })
    } catch (e) {
      console.warn('savePermissions failed', e)
    }
  },
}
import { useAddMember } from '@/hooks/useMembers'
import { useAddDistrict } from '@/hooks/useDistricts'
import useAuth from '@/hooks/useAuth.tsx'
import { District, Member } from '@/type'
import { UserRoles } from '@/type/User.ts'
import StyledButton from '@/components/styled/StyledButton.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { Ward } from '@/type/Ward.ts'

type WardDoc = {
  id: number
  name: string
  members: Member[]
  districts: District[]
  permissions: UserRoles
}

const UploadWard = (): React.ReactElement => {
  const [file, setFile] = useState<File | null>()
  const { user } = useAuth()
  const fileReader = new FileReader()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)

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
            const wardList = await ((wardApi as any).getWardList as any)()
            await (wardApi as any).saveWardList([
              ...(wardList || []),
              { wardName: wardData.name },
            ])
            await (wardApi as any).createWard(wardData.name, user as any)
            setActiveWard({ wardName: wardData.name })
            console.log('Created ward', wardData.name)
            await (wardApi as any).savePermissions(
              wardData.name,
              wardData.permissions,
            )
            console.log('Added permissions', wardData.permissions)
            const addMember = useAddMember()
            const addDistrict = useAddDistrict()

            // create members sequentially to avoid overwhelming the backend
            for (const m of wardData.members) {
              try {
                await addMember.mutateAsync({ wardId: 0, member: m as any })
              } catch (err) {
                console.error('Failed to add member', m, err)
              }
            }
            console.log('Added members', wardData.members)

            for (const d of wardData.districts) {
              try {
                await addDistrict.mutateAsync({ wardId: 0, district: d as any })
              } catch (err) {
                console.error('Failed to add district', d, err)
              }
            }
            console.log('Added districts', wardData.districts)
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
