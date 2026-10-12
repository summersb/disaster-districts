package dd.resource

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class WardJoinRequestDto(
    val id: Long? = null,
    val userId: Long? = null,
    val userEmail: String? = null,
    val wardId: Long? = null,
    val wardName: String? = null,
    val status: String,
    val message: String? = null,
    val requestedAt: String? = null,
    val assignedRole: String? = null,
)

data class WardJoinCreateRequest(
    val userId: Long,
    val wardId: Long,
    val message: String? = null,
)

data class WardJoinResolveRequest(
    val approve: Boolean,
    val assignedRole: String? = "user",
    // When approving: the ward member this account belongs to, linked in the
    // same step (optional).
    val memberId: Long? = null,
)
