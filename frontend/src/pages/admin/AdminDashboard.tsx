import StyledButton from '@/components/styled/StyledButton.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { useWards } from '@/hooks/useWards'
import WardUsers from '@/pages/admin/WardUsers.tsx'
import CreateWard from '@/pages/ward/CreateWard.tsx'
import DownloadWard from '@/pages/ward/DownloadWard.tsx'
import type { Ward } from '@/type/Ward.ts'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

const AdminDashboard = (): React.ReactElement => {
  const queryClient = useQueryClient()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)
  const { data: wards } = useWards()
  const [expandedWardId, setExpandedWardId] = useState<number | null>(null)

  const selectWard = (ward: Ward & { id?: number }) => {
    setActiveWard({ name: ward.name ?? '' })
    queryClient.invalidateQueries()
  }

  const toggleExpand = (id: number) => {
    setExpandedWardId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="p-4">
      <div className="text-xl flex justify-around mb-4">Admin Dashboard</div>
      <Tabs defaultValue="wards" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wards">Wards</TabsTrigger>
          <TabsTrigger value="create">Create Ward</TabsTrigger>
          <TabsTrigger value="download">Download Ward</TabsTrigger>
        </TabsList>

        <TabsContent value="wards">
          {(!wards || wards.length === 0) && (
            <p className="text-muted-foreground p-4 italic">
              No wards yet. Create one in the Create Ward tab.
            </p>
          )}
          <div className="space-y-2 mt-2">
            {wards?.map((ward) => {
              const wardId = (ward as any).id as number
              const isExpanded = expandedWardId === wardId
              return (
                <div key={wardId} className="rounded border">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpand(wardId)}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <span className="font-medium">{ward.name}</span>
                    </div>
                    <StyledButton onClick={() => selectWard(ward as any)}>
                      Select
                    </StyledButton>
                  </div>
                  {isExpanded && (
                    <div className="border-t px-4 pb-4">
                      <WardUsers wardId={wardId} wardName={ward.name ?? ''} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="create">
          <CreateWard />
        </TabsContent>

        <TabsContent value="download">
          <DownloadWard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard
