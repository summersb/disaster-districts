import { createFileRoute } from '@tanstack/react-router'
import { SetupForm } from '@/components/auth/SetupForm.tsx'

export const Route = createFileRoute('/setup/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SetupForm />
}
