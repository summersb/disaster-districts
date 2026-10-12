import { createFileRoute } from '@tanstack/react-router'
import MemberLocations from '@/components/members/MemberLocations.tsx'

export const Route = createFileRoute('/_protected/member/locations')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MemberLocations />
}
