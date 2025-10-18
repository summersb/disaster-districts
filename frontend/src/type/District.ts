import { MemberSchema } from './Member'
import * as z from 'zod'

export const DistrictSchema = z.object({
  id: z.number(),
  name: z.string(),
  leader: MemberSchema,
  assistant: MemberSchema.optional(),
  color: z.string(),
  members: z.array(MemberSchema),
})

export type District = z.infer<typeof DistrictSchema>
