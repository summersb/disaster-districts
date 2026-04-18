import AddMember from '@/pages/members/AddMember.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/member/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AddMember />
}
