import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import PrintDistrict from '@/components/districts/PrintDistrict.tsx'

export const Route = createFileRoute('/_protected/print/$districtId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { districtId } = Route.useParams()
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrintDistrict districtId={Number(districtId)} />
    </Suspense>
  )
}
