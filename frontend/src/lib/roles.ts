export const hasRole = (roles: string[] | undefined, role: string): boolean =>
  roles?.includes(role) ?? false

export const isAdmin = (roles: string[] | undefined) => hasRole(roles, 'admin')
export const isWardAdmin = (roles: string[] | undefined) =>
  hasRole(roles, 'ward_admin')
export const isDistrictLeader = (roles: string[] | undefined) =>
  hasRole(roles, 'district_leader')
export const canManageUsers = (roles: string[] | undefined) =>
  isAdmin(roles) || isWardAdmin(roles)

export const ALL_ROLES = [
  'admin',
  'ward_admin',
  'district_leader',
  'user',
] as const
export type Role = (typeof ALL_ROLES)[number]

// `user` is not an access level: it only means the account is attached to
// the ward, which is what lets a ward admin link it to a member. Access comes
// from being a ward admin, or from that member leading (or assisting) a
// district.
export const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  ward_admin: 'Ward Admin',
  district_leader: 'District Leader',
  user: 'Account only',
}

// The roles that actually let someone see or do something in a ward.
const ACCESS_ROLES = ['admin', 'ward_admin', 'district_leader']

/** Whether these roles give any access to a ward at all. */
export const hasWardAccess = (roles: string[] | undefined) =>
  ACCESS_ROLES.some((role) => hasRole(roles, role))

/** What to show for someone's standing in a ward, e.g. in a users table. */
export const describeAccess = (roles: string[] | undefined): string => {
  const held = ACCESS_ROLES.filter((role) => hasRole(roles, role))
  return held.length > 0
    ? held.map((role) => ROLE_LABELS[role]).join(', ')
    : 'No access'
}

// Roles an admin can hand out. `admin` is reserved for system admins, and
// `district_leader` is never granted by hand: the server gives it to a user
// while the member record their login is linked to leads or assists a district.
export const GRANTABLE_ROLES: string[] = ALL_ROLES.filter(
  (role) => role !== 'admin' && role !== 'district_leader',
)
