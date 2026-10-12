package dd.resource

data class UserRequest(
    val email: String,
    val name: String? = null,
    val password: String? = null,
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
)

data class UserUpdateRequest(
    val roles: List<String>? = null,
    val wardId: Long? = null,
    val removeFromWard: Boolean = false,
    // null leaves the member link alone; 0 (or negative) removes it.
    val memberId: Long? = null,
)
