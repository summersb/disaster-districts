package dd.resource

// The file produced by GET /wards/{id}/export and accepted by
// POST /wards/{id}/import: a ward's settings, districts and members. The `id`
// fields are only references inside the file (a member's districtId, a
// district's leaderId, ...); an import never reuses them as database ids.

const val WARD_EXPORT_FORMAT = "disaster-districts-ward"
const val WARD_EXPORT_VERSION = 1

data class WardExport(
    val format: String = "",
    val version: Int = 0,
    val exportedAt: String? = null,
    val ward: WardExportSettings = WardExportSettings(),
    val districts: List<DistrictExport> = emptyList(),
    val members: List<MemberExport> = emptyList(),
)

data class WardExportSettings(
    val name: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
    val leaderId: Long? = null,
)

data class DistrictExport(
    val id: Long? = null,
    val name: String = "",
    val color: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val leaderId: Long? = null,
    val assistantId: Long? = null,
)

data class MemberExport(
    val id: Long? = null,
    val familyName: String = "",
    val name: String = "",
    val formattedAddress: String? = null,
    val address1: String? = null,
    val address2: String? = null,
    val city: String? = null,
    val state: String? = null,
    val postalCode: String? = null,
    val phone: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val notes: String? = null,
    val districtId: Long? = null,
)

data class WardImportResult(
    val membersCreated: Int,
    val membersUpdated: Int,
    val districtsCreated: Int,
    val districtsUpdated: Int,
)
