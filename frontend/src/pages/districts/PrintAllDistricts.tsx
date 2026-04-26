import { useDistricts } from '@/hooks/useDistricts'
import { getWardId } from '@/lib/api'
import PrintDistrict from '@/pages/districts/PrintDistrict.tsx'
import type React from 'react'

const PrintAllDistricts = (): React.ReactElement => {
  const { data: districts } = useDistricts(getWardId())

  return (
    <>
      {!districts && <div>Loading</div>}
      {districts && districts.length === 0 && (
        <div className="p-4 text-muted-foreground">No districts to print.</div>
      )}
      {districts &&
        districts.length > 0 &&
        districts
          .slice()
          .sort((d1, d2) => d1.name.localeCompare(d2.name))
          .map((district) => (
            <div key={district.id} className="new-right-page mb-4">
              <PrintDistrict districtId={district.id} />
            </div>
          ))}
    </>
  )
}

export default PrintAllDistricts
