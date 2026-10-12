package dd.resource

data class UserRequest(
    val email: String,
    val name: String? = null,
    val password: String? = null,
)

// A user's standing in one of their wards.
data class UserWardDto(
    val id: Long,
    val name: String,
    // Roles in this ward, plus "district_leader" while the member linked
    // there leads or assists a district.
    val roles: List<String>,
    // The member record this login is linked to in this ward, if any.
    val memberId: Long? = null,
    val leaderDistrictIds: List<Long> = emptyList(),
)

data class UserDto(
    val id: Long? = null,
    val email: String,
    val name: String? = null,
    // Stored roles, plus "district_leader" while the linked member leads or
    // assists a district.
    val roles: List<String>? = null,
    val wardId: Long? = null,
    // The member record this login is linked to, if any.
    val memberId: Long? = null,
    val leaderDistrictIds: List<Long>? = null,
    // Every ward the user belongs to, with their roles in each. (roles and
    // wardId above summarize this: all roles held anywhere, and the first
    // ward.)
    val wards: List<UserWardDto>? = null,
)

data class UserUpdateRequest(
    val roles: List<String>? = null,
    // The ward the change applies to: where the roles are set, the ward to
    // add the user to (when sent alone), or the ward to remove them from.
    // Omitted, it falls back to the user's own ward.
    val wardId: Long? = null,
    val removeFromWard: Boolean = false,
    // null leaves the member link alone; 0 (or negative) removes it.
    val memberId: Long? = null,
)
