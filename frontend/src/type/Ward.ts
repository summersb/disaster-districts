import { MemberSchema } from './Member'
import { DistrictSchema } from './District'
import * as z from 'zod'

export const WardConfigSchema = z.object({
  name: z.string(),
})

export const WardSchema = z.object({
  name: z.string(),
  members: z.array(MemberSchema).optional(),
  districts: z.array(DistrictSchema).optional(),
})

export type WardConfig = z.infer<typeof WardConfigSchema>
export type Ward = z.infer<typeof WardSchema>
