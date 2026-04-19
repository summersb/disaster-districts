import type { User } from '@/context/UserContext.tsx'
import type { LoginRequest } from '@/type/User.ts'
import { useQuery } from '@tanstack/react-query'

export const checkSetupNeeded = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/auth/setup')
    if (!res.ok) return false
    const data = await res.json()
    return data.needsSetup === true
  } catch {
    return false
  }
}

export const setupAdmin = async (payload: {
  email?: string
  password?: string
  credential?: string
}) => {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Setup failed')
  return res.json()
}

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

export const googleLogin = async (credential: string) => {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
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
