import * as z from 'zod'

export type UserRoles = {
  users: {
    [name: string]: {
      role: string
      email?: string
      name?: string
    }
  }
}


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
