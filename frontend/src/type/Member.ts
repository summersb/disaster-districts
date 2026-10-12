import * as z from 'zod'

export const DistrictRefSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
})

// Most string fields can come back as null from the API (Postgres NULL → JSON
// null). z.string().optional() rejects null, so use .nullish() (null OR
// undefined) on every nullable field; otherwise React Hook Form's zodResolver
// flags an error against the entire Member, and consumers (e.g. the leader
// picker) appear "unset" even when the user picked one.
export const MemberSchema = z.object({
  id: z.number(),
  familyName: z.string(),
  formattedAddress: z.string().nullish().or(z.literal('')),
  name: z.string(),
  address1: z.string().nullish(),
  address2: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  postalCode: z.string().nullish(),
  phone: z.string().nullish(),
  lat: z
    .number({ error: 'Enter latitude as a number, like 33.1714' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullish(),
  lng: z
    .number({ error: 'Enter longitude as a number, like -117.2066' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullish(),
  notes: z.string().nullish(),
  wardId: z.number().nullish(),
  district: DistrictRefSchema.nullish(),
})

export type MemberDto = z.infer<typeof MemberSchema>
