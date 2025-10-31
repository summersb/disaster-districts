import { createFileRoute } from '@tanstack/react-router'
import EditDistrict from '@/pages/districts/EditDistrict.tsx'

export const Route = createFileRoute('/_protected/district/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <EditDistrict />
}
