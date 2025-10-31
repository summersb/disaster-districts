import { createFileRoute } from '@tanstack/react-router'
import Home from '@/pages/home/Home.tsx'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-2">
      dashboard
      <Home />
      <TanStackRouterDevtools />
    </div>
  )
}