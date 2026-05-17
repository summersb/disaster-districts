import { createFileRoute } from '@tanstack/react-router'
import AddMember from '@/components/members/AddMember.tsx'

export const Route = createFileRoute('/_protected/member/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AddMember />
}
