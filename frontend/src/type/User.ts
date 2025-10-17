export type UserRoles = {
  users: {
    [name: string]: {
      role: string
      email?: string
      name?: string
    }
  }
}

export type UserRequest = {
  id: string
  email: string
  status: string
}
