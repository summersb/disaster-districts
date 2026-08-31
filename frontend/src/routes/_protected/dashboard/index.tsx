import { createFileRoute } from '@tanstack/react-router'
import WardsOverview from '@/components/admin/WardsOverview.tsx'
import useUser from '@/context/useUser.tsx'
import { isAdmin } from '@/lib/roles'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = useUser()

  if (isAdmin(user.roles)) {
    return <WardsOverview />
  }

  return (
    <div className="p-2">
      dashboard
      <div>Home select a ward</div>
    </div>
  )
}
