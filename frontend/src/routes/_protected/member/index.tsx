import { createFileRoute } from '@tanstack/react-router'
import MemberList from '@/pages/members/MemberList.tsx'

export const Route = createFileRoute('/_protected/member/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MemberList />
}
