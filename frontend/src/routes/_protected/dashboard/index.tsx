import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Home from '@/pages/home/Home.tsx'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {

  return (
    <div className="p-2">
      dashboard
      <Home />
    </div>
  )
}