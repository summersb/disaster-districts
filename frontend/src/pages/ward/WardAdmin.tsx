import React from 'react'
import DownloadWard from '@/pages/ward/DownloadWard.tsx'
import WardPermissions from '@/pages/ward/WardPermissions.tsx'

const WardAdmin = (): React.ReactElement => {
  return (
    <div>
      <DownloadWard />
      <WardPermissions />
    </div>
  )
}

export default WardAdmin
