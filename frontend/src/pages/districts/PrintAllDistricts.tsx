import React from 'react'
import { useDistricts } from '@/hooks/useDistricts'
import PrintDistrict from '@/pages/districts/PrintDistrict.tsx'

const PrintAllDistricts = (): React.ReactElement => {
  const { data: districts } = useDistricts(0 as any)

  return (
    <>
      {!districts && <div>Loading</div>}
      {districts &&
        districts.length > 0 &&
        districts
          ?.sort((d1, d2) => d1.name.localeCompare(d2.name))
          .map((district) => (
            <div key={district.id} className="new-right-page mb-4">
              <PrintDistrict districtId={district.id} />
            </div>
          ))}
    </>
  )
}

export default PrintAllDistricts
