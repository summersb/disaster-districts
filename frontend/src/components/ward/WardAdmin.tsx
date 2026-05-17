import type React from 'react'
import DownloadWard from '@/components/ward/DownloadWard.tsx'
import WardPermissions from '@/components/ward/WardPermissions.tsx'

const WardAdmin = (): React.ReactElement => {
  return (
    <div>
      <DownloadWard />
      <WardPermissions />
    </div>
  )
}

export default WardAdmin
