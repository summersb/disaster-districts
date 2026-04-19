import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { useDistrict } from '@/hooks/useDistricts'
import ShowOneDistrictMap from '@/pages/districts/ShowOneDistrictMap'
import type React from 'react'

type DistrictProps = {
  districtId?: number
}

const PrintDistrict = (props: DistrictProps): React.ReactElement => {
  // todo
  const districtId = 0

  const id =
    props.districtId != null ? props.districtId : Number(districtId ?? 0)
  const { data: district } = useDistrict(0 as any, id)

  return (
    <div className="new-right-page page">
      {district && (
        <>
          <h1>District Name: {district.name}</h1>
          <h2>
            Leader <MemberDisplayName member={district.leader} />
          </h2>
          <h2>
            Assistant Leader <MemberDisplayName member={district.assistant} />
          </h2>
          <Table className="print:visible">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(district.members ?? [])
                .slice()
                .sort((m1, m2) => m1.familyName.localeCompare(m2.familyName))
                .map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <MemberDisplayName member={m} />
                    </TableCell>
                    <TableCell>
                      {m.address1} {m.address2}, {m.city}
                    </TableCell>
                    <TableCell>{m.phone}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <ShowOneDistrictMap district={district} showDistrictMarker={false} />
        </>
      )}
    </div>
  )
}

export default PrintDistrict
