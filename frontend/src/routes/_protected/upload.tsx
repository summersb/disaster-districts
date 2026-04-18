import UploadMembers from '@/pages/members/UploadMembers.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return <UploadMembers />
}
