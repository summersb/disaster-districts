import React from 'react'
import { getPerms } from '@/api/wardApi.ts'
import { getDistrictList, getMemberList } from '@/api'
import StyledButton from '@/components/styled/StyledButton.tsx'

export const DownloadWard = (): React.ReactElement => {
  const downloadWard = async () => {
    const members = await getMemberList()
    const districts = await getDistrictList()
    const permissions = await getPerms()

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
