import type React from 'react'
import { createContext, useState } from 'react'

export type User = {
  id?: number
  email?: string
  avatarUrl?: string
  wardId?: number
  // The member record this login is linked to, if a ward admin set one.
  memberId?: number
  token?: string
  roles?: string[]
}

export interface UserContextType {
  user: User
  setUser: (user: User) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

type AuthProviderType = {
  children: React.ReactElement
}

export const UserProvider = ({
  children,
}: AuthProviderType): React.ReactElement => {
  const [user, setUser] = useState<User>(() => {
    try {
      const stored = window.localStorage.getItem('user')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}

export default UserContext
