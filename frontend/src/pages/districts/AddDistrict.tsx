import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
// import type { DistrictDbType } from '@/type' (unused in this UI file)
import React, { useState } from 'react'
import { useAddDistrict } from '@/hooks/useDistricts'
import { genId } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input.tsx'
import { ColorPicker } from '@/components/ColorPicker.tsx'
import SaveButton from '@/components/styled/SaveButton.tsx'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'

type CreateDistrict = {
  name: string
  color: string
}

const AddDistrict = (): React.ReactElement => {
  const [disabled, setDisabled] = useState<boolean>(false)
  const navigate = useNavigate()
  const form = useForm<CreateDistrict>({
    defaultValues: { name: '', color: 'Red' },
  })

  const addDistrict = useAddDistrict()

  const onSubmit = async ({ name, color }: CreateDistrict) => {
    setDisabled(true)
    const data: any = {
      id: genId(),
      name: name,
      leaderId: undefined,
      assistantId: undefined,
      color: color,
      members: [],
    }
    try {
      await addDistrict.mutateAsync({ wardId: 0, district: data as any })
      navigate({ to: DistrictRoute.to, params: { id: String(data.id) } }).catch(err => console.log(err))
    } catch (err) {
      console.error('Failed to create district', err)
    } finally {
      setDisabled(false)
    }
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="mb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <Input
                        placeholder="District name"
                        {...field}
                        className="text-white bg-gray-900"
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="mb-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="mb-4 text-black bg-slate-500">
                      <ColorPicker
                        selectedColor={field.value}
                        setSelectedColor={(color) => {
                          form.setValue('color', color)
                        }}
                        className="text-white bg-gray-900"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="text-gray-700 mb-4">
            <SaveButton
              saving={disabled}
              name="Create"
              disableName="Creating"
            />
          </div>
        </form>
      </Form>
    </div>
  )
}

export default AddDistrict
