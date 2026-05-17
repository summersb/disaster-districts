import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import OSMLocationPicker from '@/components/OSMLocationPicker.tsx'
import StyledButton from '@/components/styled/StyledButton.tsx'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input.tsx'
import useUser from '@/context/useUser.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState.tsx'
import type { Ward } from '@/type/Ward.ts'

const schema = z.object({
  name: z.string().trim().min(1, 'Ward name is required'),
  lat: z.number({ error: 'Select a center point on the map' }),
  lng: z.number({ error: 'Select a center point on the map' }),
})

type FormValues = z.infer<typeof schema>

const CreateWard = (): React.ReactElement => {
  const { user } = useUser()
  const [, setActiveWard] = useLocalStorageState<Ward>('ward', undefined)
  const queryClient = useQueryClient()
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
    },
  })
  const onSubmit = async (values: FormValues) => {
    try {
      await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          lat: values.lat,
          lng: values.lng,
          user,
        }),
      })
    } finally {
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      setActiveWard({ name: values.name, lat: values.lat, lng: values.lng })
    }
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
              name="name"
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

          <FormField
            control={form.control}
            name="lat"
            render={() => (
              <FormItem>
                <FormLabel>Ward Center</FormLabel>
                <p className="text-sm text-muted-foreground mb-2">
                  Click on the map to set the center of the ward area.
                </p>
                <FormControl>
                  <div
                    className="w-full rounded border overflow-hidden"
                    style={{ height: '50vh', minHeight: 320 }}
                  >
                    <OSMLocationPicker
                      value={center ?? undefined}
                      onChange={(pos) => {
                        setCenter(pos)
                        form.setValue('lat', pos.lat, {
                          shouldValidate: true,
                        })
                        form.setValue('lng', pos.lng, {
                          shouldValidate: true,
                        })
                      }}
                    />
                  </div>
                </FormControl>
                {center && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

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
