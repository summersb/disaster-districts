import { createFileRoute } from '@tanstack/react-router'
import JoinWardPage from '@/components/ward/JoinWardPage'

export const Route = createFileRoute('/_protected/join-ward/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <JoinWardPage />
}
