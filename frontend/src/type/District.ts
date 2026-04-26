import * as z from 'zod'
import { MemberSchema } from './Member'

export const DistrictSchema = z.object({
  id: z.number(),
  name: z.string(),
  leader: MemberSchema,
  assistant: MemberSchema.optional(),
  color: z.string(),
  members: z.array(MemberSchema),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export type District = z.infer<typeof DistrictSchema>
