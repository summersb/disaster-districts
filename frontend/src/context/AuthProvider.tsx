import React, { createContext, useState } from 'react'

export type User = {
  uid?: string
  email?: string | null
  photoURL?: string | null
}

export interface UserContextType {
  user: User
  setUser: (user: User) => void
  signup: (email: string, password: string) => void
}

const DEFAULT = {} as UserContextType

const AuthContext = createContext<UserContextType>(DEFAULT)

type AuthProviderType = {
  children: React.ReactElement
}
export const AuthProvider = ({
  children,
}: AuthProviderType): React.ReactElement => {
  const [user, setUser] = useState<User>({})

  const signup = (email: string, password: string): void => {
    console.log('signup', user)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, signup }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
