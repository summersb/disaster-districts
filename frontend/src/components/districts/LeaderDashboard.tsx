import { Link } from '@tanstack/react-router'
import { FileDown } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import DistrictMembersMap from '@/components/districts/DistrictMembersMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMembers } from '@/hooks/useMembers'
import { useWard } from '@/hooks/useWards'
import { getWardId } from '@/lib/api'
import {
  buildDistrictReports,
  downloadBlob,
  generateDistrictsPdf,
} from '@/lib/districtPdf'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import type { DistrictDto, MemberDto } from '@/type'

const displayName = (member: MemberDto) =>
  `${member.familyName}, ${member.name}`

const memberAddress = (member: MemberDto) =>
  [
    member.address1,
    member.address2,
    member.city,
    [member.state, member.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ') ||
  member.formattedAddress ||
  ''

const Contact = ({ label, member }: { label: string; member?: MemberDto }) => (
  <p>
    <span className="text-muted-foreground">{label}: </span>
    {member ? (
      <>
        {displayName(member)}
        {member.phone && (
          <span className="text-muted-foreground"> · {member.phone}</span>
        )}
      </>
    ) : (
      <span className="text-muted-foreground">Not assigned</span>
    )}
  </p>
)

type LeaderDashboardProps = {
  // The districts the signed-in user leads or assists.
  districts: DistrictDto[]
}

// Home page for a district leader: who leads the ward, then for each of
// their districts a map of its members and the list of them.
const LeaderDashboard = ({
  districts,
}: LeaderDashboardProps): React.ReactElement => {
  const wardId = getWardId()
  const { data: ward } = useWard(wardId)
  const { data: members = [] } = useMembers(wardId)
  // Id of the district whose PDF is being created, if any.
  const [printing, setPrinting] = useState<number | null>(null)
  const [printError, setPrintError] = useState('')

  // Same PDF as the Print Districts page makes for one district: the roster
  // followed by a full-page map.
  const printDistrict = async (district: DistrictDto) => {
    setPrinting(district.id)
    setPrintError('')
    try {
      const blob = await generateDistrictsPdf(
        buildDistrictReports([district], members),
        ward?.name ?? '',
      )
      const safe = (text: string) => text.trim().replace(/[^\w-]+/g, '-')
      downloadBlob(
        blob,
        `${safe(ward?.name ?? 'ward')}-${safe(district.name ?? 'district')}.pdf`,
      )
    } catch (err) {
      console.error(err)
      setPrintError('Could not create the PDF - try again.')
    } finally {
      setPrinting(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{ward?.name ?? 'Ward'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ward Leader</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {/* From the ward itself: the ward leader is usually not in this
              leader's district, so isn't among the members they can see. */}
          <p>
            <span className="text-muted-foreground">Leader: </span>
            {ward?.leaderName ? (
              <>
                {ward.leaderName}
                {ward.leaderPhone && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {ward.leaderPhone}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Not assigned</span>
            )}
          </p>
        </CardContent>
      </Card>

      {printError && <p className="text-sm text-destructive">{printError}</p>}

      {districts.map((district) => {
        const districtMembers = members
          .filter((m) => m.district?.id === district.id)
          .sort((a, b) => displayName(a).localeCompare(displayName(b)))
        return (
          <Card
            key={district.id}
            data-testid={`leader-district-${district.id}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2">
                {district.color && (
                  <img
                    src={`/images/${district.color}.svg`}
                    alt=""
                    className="h-6 w-auto shrink-0"
                  />
                )}
                {district.name} ({districtMembers.length} members)
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={printing != null}
                onClick={() => printDistrict(district)}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {printing === district.id
                  ? 'Creating...'
                  : 'Print District (PDF)'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <Contact
                  label="Leader"
                  member={members.find((m) => m.id === district.leaderId)}
                />
                <Contact
                  label="Assistant"
                  member={members.find((m) => m.id === district.assistantId)}
                />
              </div>

              <div className="h-[420px]">
                <DistrictMembersMap
                  districts={[district]}
                  members={districtMembers}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districtMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          to={MemberEditRoute.to}
                          params={{ id: String(member.id) }}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {displayName(member)}
                        </Link>
                      </TableCell>
                      <TableCell>{memberAddress(member)}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell className="whitespace-normal">
                        {member.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default LeaderDashboard
