import { SignupForm } from '@/components/auth/SignupForm.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SignupForm />
}
