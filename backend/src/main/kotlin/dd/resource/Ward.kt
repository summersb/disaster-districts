package dd.resource

data class WardRequest(
    val id: Long? = null,
    val name: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
)

data class WardDto(
    val id: Long?,
    val name: String,
    val lat: Double? = null,
    val lng: Double? = null,
)
