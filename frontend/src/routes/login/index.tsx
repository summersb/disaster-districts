import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createFileRoute('/login/')({
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
