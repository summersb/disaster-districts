import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDistrictList } from '@/api'
import PrintDistrict from '@/pages/districts/PrintDistrict.tsx'

const PrintAllDistricts = (): React.ReactElement => {
  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: getDistrictList,
  })

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
