package dd.resource

data class UserRequest(
    val email: String,
    val password: String? = null,
)

data class UserDto(
    val id: Long? = null,
    val email: String,
    val roles: List<String>? = null,
    val wardId: Long? = null,
)

data class UserUpdateRequest(
    val roles: List<String>? = null,
    val wardId: Long? = null,
    val removeFromWard: Boolean = false,
)
