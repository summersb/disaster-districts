import { createFileRoute } from '@tanstack/react-router'
import EditMember from '@/pages/members/EditMember.tsx'

export const Route = createFileRoute('/_protected/member/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <EditMember />
}
