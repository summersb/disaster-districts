export type UserRoles = {
  users: {
    [name: string]: {
      role: string
      email?: string
      name?: string
    }
  }
}

import * as z from 'zod'

export const UserRequestSchema = z.object({
  id: z.number(),
  email: z.string(),
  status: z.string(),
})

export type UserRequest = z.infer<typeof UserRequestSchema>
