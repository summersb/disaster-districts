import PrintDistrict from '@/pages/districts/PrintDistrict.tsx'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/_protected/print/$districtId')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrintDistrict />
    </Suspense>
  )
}
