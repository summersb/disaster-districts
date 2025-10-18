import React, { useState } from 'react'
import { District } from '@/type'
import { useDeleteDistrict } from '@/hooks/useDistricts'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'

type DeleteDistrictButtonProps = {
  district: District
}
const DeleteDistrictButton = ({
  district,
}: DeleteDistrictButtonProps): React.ReactElement => {
  const [open, setOpen] = useState<boolean>(false)
  const queryClient = useQueryClient()
  const delDistrict = () => setOpen(true)
  const deleteMutation = useDeleteDistrict()

  const doDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ wardId: 0, districtId: district.id })
      await queryClient.invalidateQueries({ queryKey: ['districts'] })
    } catch (e) {
      console.log('Error ' + e)
    }
    setOpen(false)
  }
  return (
    <div>
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
    </div>
  )
}

export default DeleteDistrictButton
