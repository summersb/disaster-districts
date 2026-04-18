import AdminDashboard from '@/pages/admin/AdminDashboard.tsx'
import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/_protected/admin/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  )
}
