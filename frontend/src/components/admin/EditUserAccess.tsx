import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateUser } from '@/hooks/useUsers'
import { useWards } from '@/hooks/useWards'
import { isAdmin, ROLE_LABELS } from '@/lib/roles'
import type { UserDto } from '@/type'

type Props = {
  user: UserDto
  // The signed-in system admin, who can't take away their own system admin
  // role here (they would lose this page mid-edit).
  currentUserId?: number
  onClose: () => void
}

// Roles stored for the account in one ward. "admin" is how the server marks a
// system admin against every ward, and "district_leader" comes from the
// linked member leading a district; neither is set per ward.
const storedRolesIn = (user: UserDto, wardId: number): string[] =>
  (user.wards?.find((w) => w.id === wardId)?.roles ?? []).filter(
    (role) => role !== 'admin' && role !== 'district_leader',
  )

// The wards the account actually belongs to. A system admin is listed against
// every ward, so for them only wards with a role of their own count.
const memberWards = (user: UserDto) =>
  (user.wards ?? []).filter((w) => w.roles.some((role) => role !== 'admin'))

const errorMessage = async (res: Response): Promise<string> => {
  try {
    const body = await res.json()
    if (body?.error) return String(body.error)
  } catch {
    // Not JSON; fall through.
  }
  return `Could not save (${res.status})`
}

// Changes one account's permissions: system admin, and its access in each
// ward (ward admin or account only), adding it to wards and removing it.
// Each change is saved straight away. District leader isn't set here - it
// comes from the member the account is linked to leading a district.
const EditUserAccess = ({
  user,
  currentUserId,
  onClose,
}: Props): React.ReactElement => {
  const { data: allWards = [] } = useWards()
  const updateUser = useUpdateUser()
  const [error, setError] = useState('')
  const [addWardId, setAddWardId] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)

  const save = async (change: Parameters<typeof updateUser.mutateAsync>[0]) => {
    setError('')
    try {
      const res = await updateUser.mutateAsync(change)
      if (!res.ok) {
        setError(await errorMessage(res))
        return false
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      return false
    }
  }

  const systemAdmin = isAdmin(user.roles)
  const wards = memberWards(user)
  const addableWards = allWards.filter(
    (ward) => ward.id != null && !wards.some((w) => w.id === ward.id),
  )
  const isSelf = currentUserId != null && currentUserId === user.id

  // The server applies a system-admin change together with the account's
  // roles in its first ward (user.wardId), so those are sent back unchanged.
  const setSystemAdmin = (grant: boolean) => {
    const firstWardRoles =
      user.wardId != null ? storedRolesIn(user, user.wardId) : []
    return save({
      id: user.id,
      roles: [...(grant ? ['admin'] : []), ...firstWardRoles],
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Permissions for {user.name || user.email}</DialogTitle>
          <DialogDescription>
            {user.name ? `${user.email}. ` : ''}Changes are saved as you make
            them.
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={systemAdmin}
            disabled={updateUser.isPending || (isSelf && systemAdmin)}
            onChange={(e) => setSystemAdmin(e.target.checked)}
          />
          <span>
            <span className="font-medium">{ROLE_LABELS.admin}</span>
            <span className="block text-xs text-muted-foreground">
              {isSelf && systemAdmin
                ? "You can't remove your own system admin role."
                : 'Full access to every ward and to this page.'}
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Wards</h3>
          {wards.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              Not in any ward.
            </p>
          ) : (
            <ul className="space-y-2">
              {wards.map((ward) => {
                const stored = storedRolesIn(user, ward.id)
                const leads = ward.roles.includes('district_leader')
                const value = stored.includes('ward_admin')
                  ? 'ward_admin'
                  : 'user'
                return (
                  <li
                    key={ward.id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                    data-testid={`user-ward-${ward.id}`}
                  >
                    <span className="min-w-28 font-medium">{ward.name}</span>
                    <Select
                      value={value}
                      disabled={updateUser.isPending}
                      onValueChange={(role) =>
                        save({ id: user.id, wardId: ward.id, roles: [role] })
                      }
                    >
                      <SelectTrigger
                        className="w-44"
                        aria-label={`Access in ${ward.name}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ward_admin">
                          {ROLE_LABELS.ward_admin}
                        </SelectItem>
                        <SelectItem value="user">{ROLE_LABELS.user}</SelectItem>
                      </SelectContent>
                    </Select>
                    {confirmRemoveId === ward.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={updateUser.isPending}
                          onClick={async () => {
                            if (
                              await save({
                                id: user.id,
                                wardId: ward.id,
                                removeFromWard: true,
                              })
                            ) {
                              setConfirmRemoveId(null)
                            }
                          }}
                        >
                          Confirm remove
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={updateUser.isPending}
                        aria-label={`Remove from ${ward.name}`}
                        onClick={() => setConfirmRemoveId(ward.id)}
                      >
                        Remove
                      </Button>
                    )}
                    {leads && (
                      <span className="basis-full text-xs text-muted-foreground">
                        Also a {ROLE_LABELS.district_leader} here, through the
                        member this account is linked to.
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {confirmRemoveId != null && (
            <p className="text-xs text-muted-foreground">
              Removing takes away all access to that ward and unlinks the
              account's member record there.
            </p>
          )}
        </div>

        {addableWards.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={addWardId} onValueChange={setAddWardId}>
              <SelectTrigger className="flex-1" aria-label="Add to a ward">
                <SelectValue placeholder="Add to a ward…" />
              </SelectTrigger>
              <SelectContent>
                {addableWards.map((ward) => (
                  <SelectItem key={ward.id} value={String(ward.id)}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!addWardId || updateUser.isPending}
              onClick={async () => {
                if (await save({ id: user.id, wardId: Number(addWardId) })) {
                  setAddWardId('')
                }
              }}
            >
              Add
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditUserAccess
