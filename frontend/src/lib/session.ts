import type { User, UserWard } from '@/context/UserContext'

// What the server returns from sign-in and from GET /auth/me.
export type AuthPayload = {
  token?: string | null
  id?: number
  email: string
  // Every role the user holds anywhere; only used here to spot a system admin.
  roles?: string[]
  wards?: UserWard[]
}

// A system admin isn't in any ward; 0 means "no ward - the system view".
export const NO_WARD = 0

/**
 * Turns the server's description of a user into the session the app works
 * from. A user can belong to several wards with a different role in each, so
 * the session is always *in* one ward: `wardId`, `roles` and `memberId` are
 * the user's standing in that ward, and every page reads those.
 *
 * The ward used is, in order: the one asked for, the one the previous session
 * was in (if the user still has it), then their first ward. A system admin
 * starts in no ward at all.
 */
export const buildSession = (
  auth: AuthPayload,
  previous?: User,
  wantedWardId?: number,
): User => {
  const systemAdmin = auth.roles?.includes('admin') ?? false
  const wards = auth.wards ?? []
  const wanted = wantedWardId ?? previous?.wardId
  const active =
    wards.find((ward) => ward.id === wanted) ??
    (systemAdmin ? undefined : wards[0])

  return {
    id: auth.id ?? previous?.id,
    email: auth.email,
    token: auth.token ?? previous?.token,
    avatarUrl: previous?.avatarUrl,
    wards,
    wardId: active?.id ?? NO_WARD,
    // A system admin has every right in every ward; anyone else has just
    // what they hold in the ward they are in.
    roles: systemAdmin ? ['admin'] : (active?.roles ?? ['user']),
    memberId: active?.memberId ?? undefined,
  }
}

/** The same user, now working in another of their wards. */
export const switchSessionWard = (user: User, wardId: number): User =>
  buildSession(
    {
      id: user.id,
      email: user.email ?? '',
      token: user.token,
      roles: user.roles?.includes('admin') ? ['admin'] : [],
      wards: user.wards,
    },
    user,
    wardId,
  )
