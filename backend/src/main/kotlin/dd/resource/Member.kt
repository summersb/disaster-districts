package dd.resource

data class MemberRequest(
    val id: Long? = null,
    val familyName: String = "",
    val formattedAddress: String? = null,
    val name: String = "",
    val address1: String? = null,
    val address2: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val phone: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val notes: String? = null,
)

data class DistrictRefDto(
    val id: Long?,
    val name: String?,
    val color: String?,
)

data class MemberDto(
    val id: Long?,
    val wardId: Long?,
    val familyName: String?,
    val formattedAddress: String?,
    val name: String?,
    val address1: String?,
    val address2: String?,
    val city: String?,
    val state: String?,
    val postalCode: String?,
    val phone: String?,
    val lat: Double?,
    val lng: Double?,
    val notes: String?,
    val district: DistrictRefDto?,
)