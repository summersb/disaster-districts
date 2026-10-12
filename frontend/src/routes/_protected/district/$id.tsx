import { createFileRoute } from '@tanstack/react-router'
import EditDistrict from '@/components/districts/EditDistrict.tsx'
import useUser from '@/context/useUser.tsx'
import { canManageUsers } from '@/lib/roles'

export const Route = createFileRoute('/_protected/district/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  // Only ward admins can change a district; everyone else gets the same
  // page read-only instead of a form whose Save the server would refuse.
  const { user } = useUser()
  return (
    <EditDistrict
      districtId={Number(id)}
      readOnly={!canManageUsers(user.roles)}
    />
  )
}
