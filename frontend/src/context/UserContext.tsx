import type React from 'react'
import { createContext, useState } from 'react'

// One of the wards a user belongs to, with their standing there.
export type UserWard = {
  id: number
  name: string
  roles: string[]
  // The member record their login is linked to in this ward, if any.
  memberId?: number | null
  leaderDistrictIds?: number[]
}

// The signed-in session. A user can belong to several wards; `wardId`,
// `roles` and `memberId` describe the one they are currently working in (see
// lib/session.ts), and `wards` lists all of them for switching.
export type User = {
  id?: number
  email?: string
  avatarUrl?: string
  wardId?: number
  memberId?: number
  token?: string
  roles?: string[]
  wards?: UserWard[]
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
