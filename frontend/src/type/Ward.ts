import * as z from 'zod'
import { DistrictSchema } from './District'
import { MemberSchema } from './Member'

export const WardConfigSchema = z.object({
  name: z.string(),
})

export const WardSchema = z.object({
  name: z.string(),
  wardName: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  members: z.array(MemberSchema).optional(),
  districts: z.array(DistrictSchema).optional(),
})

export type WardConfig = z.infer<typeof WardConfigSchema>
export type Ward = z.infer<typeof WardSchema>
