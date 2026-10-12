package dd.resource

data class WardRequest(
    val id: Long? = null,
    val name: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
    // null leaves the ward leader alone; 0 (or negative) clears it.
    val leaderId: Long? = null,
)

data class WardDto(
    val id: Long?,
    val name: String,
    val lat: Double? = null,
    val lng: Double? = null,
    val leaderId: Long? = null,
    val leaderName: String? = null,
    val leaderPhone: String? = null,
)
