import React from 'react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input.tsx'
import { WardConfig } from '@/type/Ward.ts'
import { createWard, getWardList, saveWardList } from '@/api/wardApi.ts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import useAuth from '@/hooks/useAuth.tsx'
import StyledButton from '@/components/styled/StyledButton.tsx'

const CreateWard = (): React.ReactElement => {
  const { user } = useAuth()
  const [, setActiveWard] = useLocalStorageState<WardConfig>('ward', undefined)
  const { data } = useQuery({ queryKey: ['wardList'], queryFn: getWardList })
  const queryClient = useQueryClient()
  const form = useForm<WardConfig>({
    defaultValues: {
      wardName: '',
    },
  })
  const onSubmit = async (wardConfig: WardConfig) => {
    await createWard(wardConfig.wardName, user)
    await saveWardList([...(data || []), wardConfig])
    queryClient.invalidateQueries({ queryKey: ['wardList'] })
    setActiveWard(wardConfig)
  }
  return (
    <div>
      Create New Ward
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-2/3 space-y-6"
        >
          <div className="mb-4">
            <FormField
              control={form.control}
              name="wardName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Name</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <Input
                        placeholder="Ward name"
                        {...field}
                        className="text-white bg-gray-900"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mb-4">
            <StyledButton variant="outline" type="submit">
              Create
            </StyledButton>
          </div>
        </form>
      </Form>
    </div>
  )
}

export default CreateWard
