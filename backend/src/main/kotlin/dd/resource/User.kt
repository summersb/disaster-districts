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
    val roles: List<String>? = null,
    val wardId: Long? = null,
)

data class UserUpdateRequest(
    val roles: List<String>? = null,
    val wardId: Long? = null,
    val removeFromWard: Boolean = false,
)
