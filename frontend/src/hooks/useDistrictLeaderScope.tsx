import useUser from '@/context/useUser.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { getWardId } from '@/lib/api'
import { canManageUsers } from '@/lib/roles'
import type { DistrictDto } from '@/type'

export type DistrictLeaderScope = {
  // True for a user whose access comes from leading (or assisting) a
  // district: they are shown only their own district(s). Ward admins and
  // system admins are never scoped, even if they also lead a district.
  leaderOnly: boolean
  // The districts the user leads or assists.
  districts: DistrictDto[]
  districtIds: Set<number>
}

/**
 * Works out whether the current user should get the district leader's view.
 * It is derived from live district data (which member leads what) and the
 * member record the login is linked to, so it follows reassignment without a
 * new sign-in. This shapes what the pages show; what a leader may change is
 * enforced by the server.
 */
export const useDistrictLeaderScope = (): DistrictLeaderScope => {
  const { user } = useUser()
  const { data: allDistricts = [] } = useDistricts(getWardId())
  const memberId = user.memberId
  const districts =
    memberId == null
      ? []
      : allDistricts.filter(
          (d) => d.leaderId === memberId || d.assistantId === memberId,
        )
  return {
    leaderOnly: !canManageUsers(user.roles) && districts.length > 0,
    districts,
    districtIds: new Set(districts.map((d) => d.id)),
  }
}
