import { MemberSchema } from './Member'
import { DistrictSchema } from './District'
import * as z from 'zod'

export const WardConfigSchema = z.object({
  wardName: z.string(),
})

export const WardSchema = z.object({
  wardName: z.string(),
  members: z.array(MemberSchema).optional(),
  districts: z.array(DistrictSchema).optional(),
})

export type WardConfig = z.infer<typeof WardConfigSchema>
export type Ward = z.infer<typeof WardSchema>
