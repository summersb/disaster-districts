import Districts from '@/pages/districts/Districts.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/district/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Districts />
}
