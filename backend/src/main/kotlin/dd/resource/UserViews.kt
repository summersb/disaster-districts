package dd.resource

import dd.dao.UserAccountDao
import dd.repository.WardRepository
import dd.security.DistrictLeaders
import jakarta.enterprise.context.ApplicationScoped

/** Builds the user DTOs, so every endpoint describes a user's wards the same way. */
@ApplicationScoped
class UserViews(
    val districtLeaders: DistrictLeaders,
    val wardRepository: WardRepository,
) {
    /**
     * The wards [user] can work in, with their standing in each. A system
     * admin isn't a member of any ward but can act in all of them, so they
     * get every ward with the single role "admin".
     */
    fun wards(user: UserAccountDao): List<UserWardDto> {
        if (user.hasRole("admin")) {
            // Alongside "admin", any role they have been given in a ward by
            // name is listed too - a system admin can also be a ward's admin
            // of record, or linked to a member there.
            return wardRepository.listAll().sortedBy { it.name?.lowercase() }.map { ward ->
                val wardId = ward.id ?: 0
                UserWardDto(
                    id = wardId,
                    name = ward.name ?: "",
                    roles = listOf("admin") + districtLeaders.rolesIn(user, wardId),
                    memberId = user.memberIn(wardId)?.id,
                    leaderDistrictIds = districtLeaders.districtIds(user, wardId),
                )
            }
        }
        val names = user.userRoles.mapNotNull { it.ward }.associate { (it.id ?: 0) to (it.name ?: "") }
        return user.wardRoles().keys.map { wardId ->
            UserWardDto(
                id = wardId,
                name = names[wardId] ?: "",
                roles = districtLeaders.rolesIn(user, wardId),
                memberId = user.memberIn(wardId)?.id,
                leaderDistrictIds = districtLeaders.districtIds(user, wardId),
            )
        }.sortedBy { it.name.lowercase() }
    }

    fun toDto(user: UserAccountDao): UserDto {
        val firstWardId = user.getWard()?.id
        return UserDto(
            id = user.id,
            email = user.email,
            name = user.name,
            roles = districtLeaders.roles(user),
            wardId = firstWardId,
            memberId = (user.memberIn(firstWardId) ?: user.members.firstOrNull())?.id,
            leaderDistrictIds = districtLeaders.districtIds(user),
            wards = wards(user),
        )
    }
}
