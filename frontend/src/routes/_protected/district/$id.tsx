import EditDistrict from '@/pages/districts/EditDistrict.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/district/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <EditDistrict />
}
