import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import type { DistrictDbType } from '@/type'
import React, { useState } from 'react'
import { saveDistrict } from '@/api'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input.tsx'
import { ColorPicker } from '@/components/ColorPicker.tsx'
import SaveButton from '@/components/styled/SaveButton.tsx'

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

  const onSubmit = ({ name, color }: CreateDistrict) => {
    console.log('saving', name)
    setDisabled(true)
    // create new district
    // forward to edit district
    const data: DistrictDbType = {
      id: crypto.randomUUID(),
      name: name,
      leaderId: undefined,
      assistantId: undefined,
      color: color,
      members: [],
    }
    saveDistrict(data).then(() => {
      navigate(`/district/${data.id}`)
    })
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
