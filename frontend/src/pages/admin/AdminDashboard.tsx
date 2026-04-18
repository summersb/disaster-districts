import StyledButton from '@/components/styled/StyledButton.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import { useWards } from '@/hooks/useWards'
import UploadWard from '@/pages/admin/UploadWard.tsx'
import CreateWard from '@/pages/ward/CreateWard.tsx'
import DownloadWard from '@/pages/ward/DownloadWard.tsx'
import type { Ward } from '@/type/Ward.ts'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'

const AdminDashboard = (): React.ReactElement => {
  const queryClient = useQueryClient()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)
  const { data } = useWards()
  const select = (name: string) => {
    setActiveWard({ name: name })
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
              <StyledButton key={wc.name} onClick={() => select(wc.name)}>
                {wc.name}
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
