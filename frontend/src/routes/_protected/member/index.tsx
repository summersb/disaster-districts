import MemberList from '@/pages/members/MemberList.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/member/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MemberList />
}
