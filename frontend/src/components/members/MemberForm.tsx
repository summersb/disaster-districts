import type React from 'react'
import { useState } from 'react'
import { type ControllerRenderProps, useFormContext } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea.tsx'

// "33.17141046960068, -117.20659972284487" - the "lat, lng" pair Google Maps
// puts on the clipboard.
const COORDINATE_PAIR = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/

const parsePair = (text: string): [number, number] | null => {
  const match = COORDINATE_PAIR.exec(text)
  return match ? [Number(match[1]), Number(match[2])] : null
}

// What the form should hold for the text in a coordinate box: null when
// empty, a number when it parses, otherwise the raw text so validation can
// reject it.
const parseCoordinate = (text: string): number | string | null => {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : trimmed
}

// Extends the input's own props so FormControl can still inject the id and
// aria attributes that tie the box to its label and error message.
type CoordinateInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'onBlur' | 'onPaste' | 'name' | 'ref'
> & {
  field: ControllerRenderProps
  onPair: (lat: number, lng: number) => void
}

// A text box whose form value is a number (the schema rejects strings). The
// typed text is kept separately so partial input like "-" or "33." isn't
// rewritten mid-keystroke; whenever the form value changes underneath it
// (reset, or a pasted pair) the box shows that value instead.
const CoordinateInput = ({ field, onPair, ...props }: CoordinateInputProps) => {
  const [draft, setDraft] = useState('')
  const value = field.value ?? null
  const text = Object.is(parseCoordinate(draft), value)
    ? draft
    : value == null
      ? ''
      : String(value)

  const update = (next: string) => {
    const pair = parsePair(next)
    if (pair) {
      onPair(pair[0], pair[1])
      return
    }
    setDraft(next)
    field.onChange(parseCoordinate(next))
  }

  return (
    <Input
      {...props}
      ref={field.ref}
      name={field.name}
      inputMode="decimal"
      value={text}
      onBlur={field.onBlur}
      onChange={(e) => update(e.target.value)}
      onPaste={(e) => {
        // Handle a pasted "lat, lng" pair here so it replaces both boxes
        // rather than being inserted at the cursor of this one.
        const pair = parsePair(e.clipboardData.getData('text'))
        if (pair) {
          e.preventDefault()
          onPair(pair[0], pair[1])
        }
      }}
    />
  )
}

// How much of the form the current user may change:
//   all     - everything (ward admins)
//   contact - address, phone and notes only (the member's district leader)
//   none    - read-only
export type MemberFormAccess = 'all' | 'contact' | 'none'

type MemberFormProps = {
  access?: MemberFormAccess
}

const MemberForm = ({ access = 'all' }: MemberFormProps) => {
  const { control, setValue } = useFormContext()
  const canEditIdentity = access === 'all'
  const canEditContact = access !== 'none'

  const setCoordinates = (lat: number, lng: number) => {
    const options = { shouldDirty: true, shouldValidate: true }
    setValue('lat', lat, options)
    setValue('lng', lng, options)
  }

  return (
    <>
      <FormField
        control={control}
        name="familyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Family Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Family name"
                disabled={!canEditIdentity}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Name"
                disabled={!canEditIdentity}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
              <Input
                placeholder="760-555-1212"
                disabled={!canEditContact}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="address1"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Input
                placeholder="123 Street"
                disabled={!canEditContact}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="address2"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address2</FormLabel>
            <FormControl>
              <Input
                placeholder="Apt 23"
                disabled={!canEditContact}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <Input
                placeholder="Vista"
                disabled={!canEditContact}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            <FormControl>
              <Input placeholder="CA" disabled={!canEditContact} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="postalCode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zip Code</FormLabel>
            <FormControl>
              <Input
                placeholder="92084"
                disabled={!canEditContact}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lat"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Latitude</FormLabel>
            <FormControl>
              <CoordinateInput
                field={field}
                disabled={!canEditIdentity}
                placeholder="33.171410"
                onPair={setCoordinates}
              />
            </FormControl>
            <FormDescription>
              Tip: copy a location from Google Maps (for example "33.171410,
              -117.206599") and paste it into either box to fill both.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lng"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Longitude</FormLabel>
            <FormControl>
              <CoordinateInput
                field={field}
                disabled={!canEditIdentity}
                placeholder="-117.206599"
                onPair={setCoordinates}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Additional information"
                disabled={!canEditContact}
                rows={5}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

export default MemberForm
