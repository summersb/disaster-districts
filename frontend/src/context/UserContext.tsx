import React, { createContext, useState } from 'react'

export type User = {
  id?: number
  email?: string
  avatarUrl?: string
}

export interface UserContextType {
  user: User
  setUser: (user: User) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

type AuthProviderType = {
  children: React.ReactElement
}

export const UserProvider = ({ children }: AuthProviderType): React.ReactElement => {
  const [user, setUser] = useState<User>({})

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}

export default UserContext
