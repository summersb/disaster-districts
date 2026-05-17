import { createFileRoute } from '@tanstack/react-router'
import AddDistrict from '@/components/districts/AddDistrict.tsx'

export const Route = createFileRoute('/_protected/district/add')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AddDistrict />
}
