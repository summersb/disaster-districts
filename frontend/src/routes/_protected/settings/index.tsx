import { createFileRoute } from '@tanstack/react-router'
import Settings from '@/pages/settings/Settings.tsx'

export const Route = createFileRoute('/_protected/settings/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Settings />
}
