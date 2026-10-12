import * as z from 'zod'

export const LoginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginRequest = z.infer<typeof LoginSchema>

export const UserRequestSchema = z.object({
  id: z.number(),
  email: z.string(),
  status: z.string(),
  password: z.string(),
})

export type UserRequest = z.infer<typeof UserRequestSchema>

export type UserDto = {
  id: number
  email: string
  name?: string
  roles: string[]
  wardId?: number
  // The member record this login is linked to, if any.
  memberId?: number | null
  // Districts that member leads or assists (what makes a district leader).
  leaderDistrictIds?: number[]
  // Every ward the user belongs to, with their roles in each.
  wards?: {
    id: number
    name: string
    roles: string[]
    memberId?: number | null
  }[]
}
