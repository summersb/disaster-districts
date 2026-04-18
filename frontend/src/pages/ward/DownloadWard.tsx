import StyledButton from '@/components/styled/StyledButton.tsx'
import { useDistricts } from '@/hooks/useDistricts.tsx'
import { useMembers } from '@/hooks/useMembers.tsx'
import type React from 'react'

const fetchPerms = async () => {
  const res = await fetch('/api/wards/permissions')
  return res.json()
}

export const DownloadWard = (): React.ReactElement => {
  const { data: members } = useMembers(0 as any)
  const { data: districts } = useDistricts(0 as any)

  const downloadWard = async () => {
    const permissions = await fetchPerms()

    const jsonString = JSON.stringify(
      { members: members, districts: districts, permissions: permissions },
      null,
      2,
    )
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'ward'
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  return (
    <div>
      <StyledButton onClick={downloadWard}>Download Ward</StyledButton>
    </div>
  )
}

export default DownloadWard
