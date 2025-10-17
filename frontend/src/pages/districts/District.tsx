import { useState } from 'react'
import type { DistrictDbType } from '@/type'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { deleteDistrict, getMemberList } from '@/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { FilePenLine, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'

type DistrictProps = {
  district: DistrictDbType
}

export default function District(props: DistrictProps) {
  const { district: d } = props
  const [open, setOpen] = useState<boolean>(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const delDistrict = () => {
    setOpen(true)
  }

  const doDelete = () => {
    deleteDistrict(d.id).then(() => {
      queryClient
        .invalidateQueries({ queryKey: ['districts'] })
        .catch((e) => console.log('Error ' + e))
    })
    setOpen(false)
  }

  const leader = data?.find((m) => m.id == d.leaderId)
  const assistant = data?.find((m) => m.id == d.assistantId)
  return (
    <TableRow>
      <TableCell>
        <Link to={`/district/${d.id}`}>
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
