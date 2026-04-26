import JoinRequestsPage from '@/pages/admin/JoinRequestsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/admin/join-requests/')({
  component: JoinRequestsPage,
})
