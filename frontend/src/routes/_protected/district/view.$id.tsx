import { createFileRoute } from '@tanstack/react-router'
import EditDistrict from '@/components/districts/EditDistrict.tsx'

export const Route = createFileRoute('/_protected/district/view/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  return <EditDistrict districtId={Number(id)} readOnly />
}
