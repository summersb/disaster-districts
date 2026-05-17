import { createFileRoute } from '@tanstack/react-router'
import PrintAllDistricts from '@/components/districts/PrintAllDistricts.tsx'

export const Route = createFileRoute('/_protected/print/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PrintAllDistricts />
}
