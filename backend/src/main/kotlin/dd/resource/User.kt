package dd.resource

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class User(
    val id: Long? = null,
    val email: String,
    val password: String? = null,
    val roles: List<String>? = null,
    val wardId: Long? = null,
)

data class UserUpdate(
    val roles: List<String>? = null,
    val wardId: Long? = null,
    val removeFromWard: Boolean = false,
)
