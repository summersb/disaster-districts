import { createFileRoute } from '@tanstack/react-router'
import React, { Suspense } from 'react'
import AdminDashboard from '@/pages/admin/AdminDashboard.tsx'

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
