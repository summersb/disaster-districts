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
 * exactly as long as a member record their account is linked to is the leader
 * or assistant of at least one district, so assigning or replacing a leader
 * takes effect on the user's very next request.
 */
@ApplicationScoped
class DistrictLeaders(
    val districtRepository: DistrictRepository,
) {
    /** Ids of the districts [user] leads or assists, in any ward (empty without a linked member). */
    fun districtIds(user: UserAccountDao): List<Long> =
        user.members.mapNotNull { it.id }
            .flatMap { districtRepository.findLedBy(it) }
            .mapNotNull { it.id }
            .distinct()

    /** The districts [user] leads or assists within one ward. */
    fun districtIds(user: UserAccountDao, wardId: Long): List<Long> {
        val memberId = user.memberIn(wardId)?.id ?: return emptyList()
        return districtRepository.findLedBy(memberId).mapNotNull { it.id }
    }

    /** Every role the user holds anywhere, plus [DISTRICT_LEADER_ROLE] when it applies. */
    fun roles(user: UserAccountDao): List<String> =
        user.getRoleList() + if (districtIds(user).isEmpty()) emptyList() else listOf(DISTRICT_LEADER_ROLE)

    /** The user's roles in one ward, plus [DISTRICT_LEADER_ROLE] when they lead a district there. */
    fun rolesIn(user: UserAccountDao, wardId: Long): List<String> =
        (user.wardRoles()[wardId] ?: emptyList()) +
            if (districtIds(user, wardId).isEmpty()) emptyList() else listOf(DISTRICT_LEADER_ROLE)
}
