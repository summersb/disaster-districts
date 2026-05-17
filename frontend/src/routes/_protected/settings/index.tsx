import { createFileRoute } from '@tanstack/react-router'
import { ModeToggle } from '@/components/mode-toggle'

export const Route = createFileRoute('/_protected/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-4">
      Settings
      <ModeToggle />
    </div>
  )
}
