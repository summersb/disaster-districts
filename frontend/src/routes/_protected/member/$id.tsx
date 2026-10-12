import { createFileRoute, useParams } from '@tanstack/react-router'
import EditMember from '@/components/members/EditMember.tsx'

export const Route = createFileRoute('/_protected/member/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = useParams({ from: '/_protected/member/$id' })
  return <EditMember memberId={Number(id)} />
}
