import React from 'react'
import DownloadWard from '@/pages/home/DownloadWard.tsx'
import WardPermissions from '@/pages/home/WardPermissions.tsx'

const WardAdmin = (): React.ReactElement => {
  return (
    <div>
      <DownloadWard />
      <WardPermissions />
    </div>
  )
}

export default WardAdmin
