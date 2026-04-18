package dd.resource

data class DistrictUpdateRequest(
    val name: String?,
    val color: String?,
    val leaderId: Long?,
    val assistantId: Long?,
    val members: List<Long>?
)
