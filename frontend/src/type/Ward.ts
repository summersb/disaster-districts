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

export const WardDtoSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  // The member who leads the ward, if one has been chosen.
  leaderId: z.number().nullish(),
  // Sent with the ward so a district leader, who sees only their own
  // district's members, can still be shown who leads the ward.
  leaderName: z.string().nullish(),
  leaderPhone: z.string().nullish(),
})

export type WardConfig = z.infer<typeof WardConfigSchema>
export type Ward = z.infer<typeof WardSchema>
export type WardDto = z.infer<typeof WardDtoSchema>
