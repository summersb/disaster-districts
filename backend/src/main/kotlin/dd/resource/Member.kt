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

// Checks the things the members table would otherwise reject with an opaque
// SQL error (NOT NULL / varchar length), so an import can tell the user which
// member is wrong and why. Returns null when the member is fine.
fun memberValidationError(member: MemberRequest): String? {
    if (member.familyName.isBlank() && member.name.isBlank()) return "Name is required"
    if (member.formattedAddress == null) return "Address is required"
    val limits = listOf(
        Triple("Family name", member.familyName, 255),
        Triple("Name", member.name, 255),
        Triple("Address", member.formattedAddress, 255),
        Triple("Address line 1", member.address1, 255),
        Triple("Address line 2", member.address2, 255),
        Triple("City", member.city, 255),
        Triple("State", member.state, 20),
        Triple("Postal code", member.postalCode, 20),
        Triple("Phone", member.phone, 20),
    )
    return limits.firstOrNull { (_, value, max) -> (value?.length ?: 0) > max }
        ?.let { (label, _, max) -> "$label is longer than $max characters" }
}

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

@Suppress("EnumEntryName")
enum class MemberImportStatus { created, skipped, failed }

// One entry per member submitted to POST .../members/bulk; `index` is the
// member's position in the request array.
data class MemberImportResult(
    val index: Int,
    val status: MemberImportStatus,
    val id: Long? = null,
    val error: String? = null,
)

data class MemberImportResponse(
    val created: Int,
    val skipped: Int,
    val failed: Int,
    val results: List<MemberImportResult>,
)
