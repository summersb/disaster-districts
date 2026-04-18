import Settings from '@/pages/settings/Settings.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Settings />
}
