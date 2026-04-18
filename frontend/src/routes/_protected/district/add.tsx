import AddDistrict from '@/pages/districts/AddDistrict.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/district/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AddDistrict />
}
