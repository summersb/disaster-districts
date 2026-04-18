import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { createFileRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as z from 'zod'

export const Route = createFileRoute('/login/')({
  validateSearch: z.object({ from: z.string().optional() }),
  component: RouteComponent,
})

function RouteComponent() {
  console.log('login route')
  return (
    <>
      <LoginForm />
      <TanStackRouterDevtools />
    </>
  )
}
