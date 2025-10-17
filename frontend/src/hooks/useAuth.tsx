import { useContext } from 'react'
import AuthProvider, { UserContextType } from '@/context/AuthProvider'

const useAuth = (): UserContextType => {
  return useContext<UserContextType>(AuthProvider)
}

export default useAuth
