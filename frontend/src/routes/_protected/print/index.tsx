import { createFileRoute } from '@tanstack/react-router'
import PrintDistricts from '@/components/districts/PrintDistricts.tsx'

export const Route = createFileRoute('/_protected/print/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PrintDistricts />
}
