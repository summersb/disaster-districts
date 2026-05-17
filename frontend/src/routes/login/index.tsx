import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { LoginForm } from '@/components/auth/LoginForm.tsx'

export const Route = createFileRoute('/login/')({
  validateSearch: z.object({ from: z.string().optional() }),
  component: RouteComponent,
})

function RouteComponent() {
  return <LoginForm />
}
