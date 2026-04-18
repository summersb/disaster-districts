import EditMember from '@/pages/members/EditMember.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/member/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <EditMember />
}
