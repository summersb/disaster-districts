import { Link } from '@tanstack/react-router'
import { FilePenLine, Trash2 } from 'lucide-react'
import { useState } from 'react'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import useUser from '@/context/useUser.tsx'
import { useDeleteDistrict, useDistrict } from '@/hooks/useDistricts'
import { getWardId } from '@/lib/api'
import { isWardAdmin } from '@/lib/roles'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import type { DistrictDto } from '@/type'

type DistrictProps = {
  district: DistrictDto
}

export default function DistrictCard(props: DistrictProps) {
  const wardId = getWardId()
  const { data } = useDistrict(wardId, props.district.id)
  const deleteDistrict = useDeleteDistrict()
  const { user } = useUser()
  const canDelete = isWardAdmin(user.roles)
  const { district: d } = props
  const [open, setOpen] = useState<boolean>(false)

  const doDelete = async () => {
    await deleteDistrict.mutateAsync({ wardId, districtId: d.id })
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>{d.name}</CardTitle>
        <div className="flex gap-1">
          <Link to={DistrictRoute.to} params={{ id: String(d.id) }}>
            <Button size="icon" variant="ghost">
              <FilePenLine className="h-4 w-4" />
            </Button>
          </Link>
          {canDelete && (
            <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">Leader: </span>
          <MemberDisplayName member={data?.leader} />
        </p>
        <p>
          <span className="text-muted-foreground">Assistant: </span>
          <MemberDisplayName member={data?.assistant} />
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete district?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{d.name}&quot;. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={doDelete}
              disabled={deleteDistrict.isPending}
            >
              {deleteDistrict.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
