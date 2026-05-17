import { createFileRoute } from '@tanstack/react-router'
import UploadMembers from '@/components/members/UploadMembers.tsx'

export const Route = createFileRoute('/_protected/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return <UploadMembers />
}
