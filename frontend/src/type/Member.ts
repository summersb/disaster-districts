import * as z from 'zod'

export const DistrictRefSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
})

export const MemberSchema = z.object({
  id: z.number(),
  familyName: z.string(),
  formattedAddress: z.string().optional().or(z.literal('')),
  name: z.string(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional(),
  wardId: z.number().optional(),
  district: DistrictRefSchema.optional().nullable(),
})

export type Member = z.infer<typeof MemberSchema>
