import { createFileRoute } from '@tanstack/react-router'
import SplitDistrict from '@/components/districts/SplitDistrict.tsx'

export const Route = createFileRoute('/_protected/district/split/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()
  return <SplitDistrict districtId={Number(id)} />
}
