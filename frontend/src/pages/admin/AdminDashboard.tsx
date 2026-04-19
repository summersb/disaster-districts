import StyledButton from '@/components/styled/StyledButton.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { useWards } from '@/hooks/useWards'
import CreateWard from '@/pages/ward/CreateWard.tsx'
import DownloadWard from '@/pages/ward/DownloadWard.tsx'
import type { Ward } from '@/type/Ward.ts'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'

const AdminDashboard = (): React.ReactElement => {
  const queryClient = useQueryClient()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)
  const { data: wards } = useWards()

  const selectWard = (name: string) => {
    setActiveWard({ name })
    queryClient.invalidateQueries()
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">System Admin</h1>
      <Tabs defaultValue="wards" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wards">Select Ward</TabsTrigger>
          <TabsTrigger value="create">Create Ward</TabsTrigger>
          <TabsTrigger value="download">Download Ward</TabsTrigger>
        </TabsList>

        <TabsContent value="wards">
          {(!wards || wards.length === 0) && (
            <p className="text-muted-foreground italic p-4">
              No wards yet. Create one in the Create Ward tab.
            </p>
          )}
          <div className="space-y-2 mt-2">
            {wards?.map((ward) => (
              <div
                key={(ward as any).id}
                className="flex items-center justify-between rounded border px-4 py-3"
              >
                <span className="font-medium">{ward.name}</span>
                <StyledButton onClick={() => selectWard(ward.name ?? '')}>
                  Select
                </StyledButton>
              </div>
            ))}
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
