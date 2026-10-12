import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { User } from '@/context/UserContext'
import useUser from '@/context/useUser.tsx'
import { authFetch, getStoredUser } from '@/lib/api'
import {
  type AuthPayload,
  buildSession,
  switchSessionWard,
} from '@/lib/session'

/**
 * The one place the signed-in session is written. It keeps the in-memory
 * user (React context) and the saved copy (localStorage, which every data
 * request reads) in step.
 */
export const useSession = () => {
  const { user, setUser } = useUser()
  const queryClient = useQueryClient()

  const apply = useCallback(
    (next: User) => {
      setUser(next)
      const json = JSON.stringify(next)
      window.localStorage.setItem('user', json)
      // Lets useLocalStorageState listeners in this tab pick the change up.
      window.dispatchEvent(
        new CustomEvent('local-storage', {
          detail: { key: 'user', newValue: json },
        }),
      )
    },
    [setUser],
  )

  /** Starts a session from a sign-in response. */
  const signIn = useCallback(
    (auth: AuthPayload) => apply(buildSession(auth)),
    [apply],
  )

  /** Moves the session into another of the user's wards (0 = none). */
  const switchWard = useCallback(
    async (wardId: number) => {
      apply(switchSessionWard(getStoredUser(), wardId))
      // Anything cached was for the ward being left.
      await queryClient.invalidateQueries()
    },
    [apply, queryClient],
  )

  /**
   * Re-reads the user's wards and roles from the server, so access granted
   * or removed since sign-in applies without signing in again. The ward the
   * session is in is kept when the user still has it.
   */
  const refresh = useCallback(async () => {
    const current = getStoredUser()
    if (!current.token) return
    const res = await authFetch('/api/auth/me')
    if (!res.ok) return
    const auth = (await res.json()) as AuthPayload
    const next = buildSession(auth, current)
    // Avoid re-rendering everything when nothing changed.
    if (JSON.stringify(next) !== JSON.stringify(current)) apply(next)
  }, [apply])

  return { user, signIn, switchWard, refresh }
}
