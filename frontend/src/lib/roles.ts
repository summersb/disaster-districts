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

export const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  ward_admin: 'Ward Admin',
  district_leader: 'District Leader',
  user: 'Member',
}

// Roles an admin can hand out. `admin` is reserved for system admins, and
// `district_leader` is never granted by hand: the server gives it to a user
// while the member record their login is linked to leads or assists a district.
export const GRANTABLE_ROLES: string[] = ALL_ROLES.filter(
  (role) => role !== 'admin' && role !== 'district_leader',
)
