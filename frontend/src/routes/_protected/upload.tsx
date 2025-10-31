import { createFileRoute } from '@tanstack/react-router'
import UploadMembers from '@/pages/members/UploadMembers.tsx'

export const Route = createFileRoute('/_protected/upload')({
  component: RouteComponent,
})

function RouteComponent() {
  return <UploadMembers />
}
