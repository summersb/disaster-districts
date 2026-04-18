import MapDisplay from '@/pages/map/MapDisplay.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard/map')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-screen">
      <MapDisplay showLabel={false} />
    </div>
  )
}
