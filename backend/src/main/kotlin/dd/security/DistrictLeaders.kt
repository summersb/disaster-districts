package dd.security

import dd.dao.UserAccountDao
import dd.repository.DistrictRepository
import jakarta.enterprise.context.ApplicationScoped

/**
 * Roles that can be stored for a user. Anything else a client sends - the
 * derived district_leader, the retired district_admin, a typo - is dropped.
 */
val GRANTABLE_ROLES = setOf("user", "ward_admin", "admin")

/** The role a user holds while their member record leads or assists a district. */
const val DISTRICT_LEADER_ROLE = "district_leader"

/**
 * Works out the district-leader role. It is never stored: a user has it for
 * exactly as long as the member record their account is linked to is the
 * leader or assistant of at least one district, so assigning or replacing a
 * leader takes effect on the user's very next request.
 */
@ApplicationScoped
class DistrictLeaders(
    val districtRepository: DistrictRepository,
) {
    /** Ids of the districts [user] leads or assists (empty without a linked member). */
    fun districtIds(user: UserAccountDao): List<Long> {
        val memberId = user.member?.id ?: return emptyList()
        return districtRepository.findLedBy(memberId).mapNotNull { it.id }
    }

    /** The user's stored roles, plus [DISTRICT_LEADER_ROLE] when it applies. */
    fun roles(user: UserAccountDao): List<String> =
        user.getRoleList() + if (districtIds(user).isEmpty()) emptyList() else listOf(DISTRICT_LEADER_ROLE)
}
