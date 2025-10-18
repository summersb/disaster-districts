import * as z from 'zod'

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
})

export type Member = z.infer<typeof MemberSchema>
