import { useContext } from 'react'
import UserContext, { type UserContextType } from '@/context/UserContext.tsx'

const useUser = (): UserContextType => {
  const ctx = useContext(UserContext)
  if (!ctx) {
    throw new Error('useUser() must be used within AuthProvider')
  }
  return ctx
}

export default useUser
