import React from 'react'
import { getWardList } from '@/api/wardApi.ts'
import DownloadWard from '@/pages/home/DownloadWard.tsx'
import CreateWard from '@/pages/home/CreateWard.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { WardConfig } from '@/type/Ward.ts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import UploadWard from '@/pages/admin/UploadWard.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx'
import StyledButton from '@/components/styled/StyledButton.tsx'

const AdminDashboard = (): React.ReactElement => {
  const queryClient = useQueryClient()
  const [, setActiveWard] = useLocalStorageState<WardConfig>('ward', undefined)
  const { data } = useQuery({ queryKey: ['wardList'], queryFn: getWardList })
  const select = (name: string) => {
    setActiveWard({ wardName: name })
    queryClient.invalidateQueries()
  }

  return (
    <div className="p-4">
      <div className="text-xl flex justify-around">Admin Dashboard</div>
      <Tabs defaultValue="selectward" className="w-full">
        <TabsList className="grid w-fill grid-cols-4">
          <TabsTrigger value="selectward">Select Ward</TabsTrigger>
          <TabsTrigger value="upload">Upload Ward</TabsTrigger>
          <TabsTrigger value="create">Create Ward</TabsTrigger>
          <TabsTrigger value="download">Download Ward</TabsTrigger>
        </TabsList>
        <TabsContent value="selectward">
          <div>
            Choose Ward
            {data?.map((wc) => (
              <StyledButton
                key={wc.wardName}
                onClick={() => select(wc.wardName)}
              >
                {wc.wardName}
              </StyledButton>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="create">
          <CreateWard />
        </TabsContent>
        <TabsContent value="upload">
          <UploadWard />
        </TabsContent>
        <TabsContent value="download">
          <DownloadWard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard
