import { createFileRoute } from '@tanstack/react-router'
import Districts from '@/pages/districts/Districts.tsx'

export const Route = createFileRoute('/_protected/district/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Districts />
}
