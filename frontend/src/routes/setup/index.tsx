import { SetupForm } from '@/components/auth/SetupForm.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/setup/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SetupForm />
}
