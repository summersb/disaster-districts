import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { useQuery } from '@tanstack/react-query'
import type { District } from '@/type'
import { getDistrict, getMemberList } from '@/api'
import ShowOneDistrictMap from '@/pages/districts/ShowOneDistrictMap'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { DistrictDbType } from '@/type'
import { useParams } from 'react-router-dom'

type DistrictProps = {
  districtId?: string
}

const PrintDistrict = (props: DistrictProps): React.ReactElement => {
  const { districtId } = useParams()
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const id = props.districtId != null ? props.districtId : (districtId ?? '')
  const { data } = useQuery({
    queryKey: ['district', id],
    queryFn: () => getDistrict(id),
    enabled: id != null && members !== undefined,
  })

  const convertDbDistrict = (db?: DistrictDbType): District | undefined => {
    if (!db) {
      return undefined
    }
    return {
      id: db.id,
      name: db.name,
      leader: members?.find((m) => m.id == db.leaderId) ?? {
        id: 'none',
        name: 'none',
        familyName: 'none',
      },
      assistant: members?.find((m) => m.id == db.assistantId),
      color: db.color,
      members: members?.filter((m) => db.members?.includes(m.id)),
    }
  }

  const district = convertDbDistrict(data)

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
              {district.members
                ?.sort((m1, m2) => m1.familyName.localeCompare(m2.familyName))
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
