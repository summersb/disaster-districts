import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMemberList,
  deleteMember as deleteMemberFromDb,
  getDistrictList, saveMember,
} from '@/api'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link, useNavigate } from 'react-router-dom'
import { FilePenLine, Trash2, Globe } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import type { DistrictDbType, Member } from '@/type'
import { Input } from '@/components/ui/input.tsx'
import StyledButton from '@/components/styled/StyledButton.tsx'
import { getGeo } from '@/pages/members/process.ts'

const MemberList = () => {
  const [filter, setFilter] = useState<string>()
  const [showNoDistrict, setshowNoDistrict] = useState<boolean>(false)
  const [showNoPos, setShowNoPos] = useState<boolean>(false)
  const [open, setOpen] = useState(false)
  const [id, setId] = useState<string>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: getDistrictList,
  })

  const deleteMember = () => {
    if (id) {
      deleteMemberFromDb(id)
        .then(() => {
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: ['members'] })
        })
        .catch((e) => {
          setOpen(false)
          alert(e.message)
        })
    }
  }

  const districtClicked = (district?: DistrictDbType) => {
    if (district) {
      navigate(`/district/${district.id}`)
    }
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(event.target.value)
  }

  const updateLatLng = async (member: Member) => {
    const m = await getGeo(member)
    if (m.lat !== undefined) {
      member.lat = m.lat
      member.lng = m.lng
      await saveMember(member)
      await queryClient.invalidateQueries({ queryKey: ['members'] })
    } else {
      console.log("Unable to get lat/lng")
    }
  }

  return (
    <>
      <div className="text-xl flex justify-around">Members</div>
      <div className="flex items-center">
        <span className="p-2 whitespace-nowrap">Filter by surname</span>
        <Input onChange={onChange}></Input>
      </div>
      <StyledButton
        isPressed={showNoPos}
        onClick={() => setShowNoPos(!showNoPos)}
      >
        Show missing lat/lng
      </StyledButton>
      <StyledButton
        isPressed={showNoDistrict}
        onClick={() => setshowNoDistrict(!showNoDistrict)}
      >
        Show no district
      </StyledButton>
      <Table>
        <TableCaption>List of members</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Edit</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>District</TableHead>
            <TableHead>Surname</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Formatted Address</TableHead>
            <TableHead>Address1</TableHead>
            <TableHead>Address2</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Zip</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Latitude</TableHead>
            <TableHead>Longitude</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data &&
            data
              .filter((m) =>
                m.familyName
                  .toLowerCase()
                  .includes(filter?.toLowerCase() ?? ''),
              )
              .filter((m) => (showNoPos ? m.lat == null : true))
              .filter((m) =>
                showNoDistrict
                  ? districts?.find((d) => d.members?.includes(m.id)) == null
                  : true,
              )
              .sort((m1, m2) => {
                if (
                  m1.familyName?.toLowerCase() < m2.familyName?.toLowerCase()
                ) {
                  return -1
                }
                if (
                  m1.familyName?.toLowerCase() > m2.familyName?.toLowerCase()
                ) {
                  return 1
                }
                return 0
              })
              .map((m) => {
                const district = districts?.find((d) =>
                  d.members?.includes(m.id),
                )
                const districtName = district?.name ?? ''
                return (
                  <TableRow
                    key={m.id}
                    className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
                  >
                    <TableCell>
                      <Link to={`/editmember/${m.id}`}>
                        <FilePenLine />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Globe onClick={() => updateLatLng(m)}/>
                    </TableCell>
                    <TableCell onClick={() => districtClicked(district)}>
                      {districtName}
                    </TableCell>
                    <TableCell>{m.familyName}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.formattedAddress}</TableCell>
                    <TableCell>{m.address1}</TableCell>
                    <TableCell>{m.address2}</TableCell>
                    <TableCell>{m.city}</TableCell>
                    <TableCell>{m.state}</TableCell>
                    <TableCell>{m.postalCode}</TableCell>
                    <TableCell>{m.phone}</TableCell>
                    <TableCell>{m.lat}</TableCell>
                    <TableCell>{m.lng}</TableCell>
                    <TableCell>
                      <Trash2
                        onClick={() => {
                          setId(m.id)
                          setOpen(true)
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete this
              member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMember()}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MemberList
