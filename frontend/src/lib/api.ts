import type { User } from '@/context/UserContext'

export function getStoredUser(): User {
  try {
    return JSON.parse(localStorage.getItem('user') ?? '{}') as User
  } catch {
    return {}
  }
}

export function getWardId(): number {
  return getStoredUser().wardId ?? 0
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const user = getStoredUser()
  const headers = new Headers(init?.headers)
  if (user.token) {
    headers.set('Authorization', `Bearer ${user.token}`)
  }
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(input, { ...init, headers })
}
