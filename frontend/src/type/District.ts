import * as z from 'zod'
import { MemberSchema } from './Member'

export const DistrictSchema = z.object({
  id: z.number(),
  name: z.string(),
  leader: MemberSchema.optional(),
  assistant: MemberSchema.optional(),
  color: z.string(),
  members: z.array(MemberSchema).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  leaderId: z.number().optional().nullable(),
  assistantId: z.number().optional().nullable(),
})

export type DistrictDto = z.infer<typeof DistrictSchema>
