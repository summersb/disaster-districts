import type React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UploadCsv from './UploadCsv'
import UploadPdf from './UploadPdf'

const UploadMembers = (): React.ReactElement => {
  const handleSetMembers = (_members: any) => {}

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Members</h1>
      <Tabs defaultValue="csv" className="w-full">
        <TabsList>
          <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
        </TabsList>
        <TabsContent value="csv">
          <UploadCsv setMembers={handleSetMembers} />
        </TabsContent>
        <TabsContent value="pdf">
          <UploadPdf setMembers={handleSetMembers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UploadMembers
