import JoinWardPage from '@/pages/ward/JoinWardPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/join-ward/')({
  component: JoinWardPage,
})

function RouteComponent() {
  return <JoinWardPage />
}