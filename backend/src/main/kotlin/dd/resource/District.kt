package dd.resource

data class DistrictRequest(
    val id: Long? = null,
    val name: String? = null,
    val color: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val leaderId: Long? = null,
    val assistantId: Long? = null,
    val memberIds: List<Long>? = null,
)

data class DistrictDto(
    val id: Long?,
    val name: String?,
    val color: String?,
    val lat: Double?,
    val lng: Double?,
    val wardId: Long?,
    val leaderId: Long?,
    val assistantId: Long?,
)
