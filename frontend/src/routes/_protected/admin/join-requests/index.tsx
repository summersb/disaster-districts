import { createFileRoute } from '@tanstack/react-router'
import JoinRequestsPage from '@/components/admin/JoinRequestsPage'

export const Route = createFileRoute('/_protected/admin/join-requests/')({
  component: JoinRequestsPage,
})
