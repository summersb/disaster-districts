package dd.resource

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_EMPTY)
data class User (
    val email: String,
    val password: String? = null
)
