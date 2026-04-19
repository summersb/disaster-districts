export const hasRole = (roles: string[] | undefined, role: string): boolean =>
  roles?.includes(role) ?? false

export const isAdmin = (roles: string[] | undefined) => hasRole(roles, 'admin')
export const isWardAdmin = (roles: string[] | undefined) => hasRole(roles, 'ward_admin')
export const isDistrictAdmin = (roles: string[] | undefined) => hasRole(roles, 'district_admin')
export const canManageUsers = (roles: string[] | undefined) =>
  isAdmin(roles) || isWardAdmin(roles)

export const ALL_ROLES = ['admin', 'ward_admin', 'district_admin', 'user'] as const
export type Role = (typeof ALL_ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  ward_admin: 'Ward Admin',
  district_admin: 'District Admin',
  user: 'Member',
}
