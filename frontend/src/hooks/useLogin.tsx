import type { User } from '@/context/UserContext.tsx'
import type { LoginRequest } from '@/type/User.ts'
import { useQuery } from '@tanstack/react-query'

export const login = async (user: LoginRequest) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  })
  if (!res.ok) {
    throw new Error(res.statusText)
  }
  return await res.json()
}

export const signup = async (user: LoginRequest) => {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  })
  if (!res.ok) {
    throw new Error(res.statusText)
  }
}

export const useLogin = async (user: LoginRequest) => {
  return useQuery<User>({
    queryKey: ['user', user.email],
    queryFn: () => login(user),
  })
}
