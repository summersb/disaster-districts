import PrintAllDistricts from '@/pages/districts/PrintAllDistricts.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/print/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PrintAllDistricts />
}
