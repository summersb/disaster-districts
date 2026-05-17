import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '@/components/auth/SignupForm.tsx'

export const Route = createFileRoute('/signup/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SignupForm />
}
