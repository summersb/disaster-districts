import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { TableCell, TableRow } from '@/components/ui/table'
import { useDeleteDistrict, useDistrict } from '@/hooks/useDistricts'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import type { District } from '@/type'
import { Link } from '@tanstack/react-router'
import { FilePenLine, Trash2 } from 'lucide-react'
import { useState } from 'react'

type DistrictProps = {
  district: District
}

export default function District(props: DistrictProps) {
  const { data } = useDistrict(0, props.district.id)
  const deleteDistrict = useDeleteDistrict()
  const { district: d } = props
  const [open, setOpen] = useState<boolean>(false)

  const delDistrict = () => {
    setOpen(true)
  }

  const doDelete = () => {
    deleteDistrict.mutate({ wardId: 0, districtId: d.id })
    setOpen(false)
  }

  const leader = data?.leader
  const assistant = data?.assistant
  return (
    <TableRow>
      <TableCell>
        <Link to={DistrictRoute.to} params={{ id: String(d.id) }}>
          <Button size="icon">
            <FilePenLine />
          </Button>
        </Link>
      </TableCell>
      <TableCell>{d.name}</TableCell>
      <TableCell>
        <MemberDisplayName member={leader} />
      </TableCell>
      <TableCell>
        <MemberDisplayName member={assistant} />
      </TableCell>
      <TableCell>
        <Trash2 onClick={delDistrict} />
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
                    onClick={() => doDelete()}
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
      </TableCell>
    </TableRow>
  )
}
