import { createFileRoute } from '@tanstack/react-router'
import MemberList from '@/components/members/MemberList.tsx'

export const Route = createFileRoute('/_protected/member/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MemberList />
}
