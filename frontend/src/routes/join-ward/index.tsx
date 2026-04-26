import JoinWardPage from '@/pages/ward/JoinWardPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/join-ward/')({
  component: JoinWardPage,
})
