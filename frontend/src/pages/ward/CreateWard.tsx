import React from 'react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Ward } from '@/type/Ward.ts'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import useUser from '@/context/useUser.tsx'
import StyledButton from '@/components/styled/StyledButton.tsx'

const CreateWard = (): React.ReactElement => {
  const { user } = useUser()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)
  const queryClient = useQueryClient()
  const form = useForm<Ward>({
    defaultValues: {
      name: '',
    },
  })
  const onSubmit = async (ward: Ward) => {
    try {
      await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ward.name, user }),
      })
    } finally {
      queryClient.invalidateQueries({ queryKey: ['wardList'] })
      setActiveWard(ward)
    }
  }
  return (
    <div>
      Create New Ward
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-6">
          <div className="mb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ward Name</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <Input placeholder="Ward name" {...field} className="text-white bg-gray-900" />
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
