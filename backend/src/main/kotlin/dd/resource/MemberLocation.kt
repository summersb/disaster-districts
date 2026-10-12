package dd.resource

// Why a member is listed by GET .../members/outliers.
@Suppress("EnumEntryName")
enum class OutlierReason { missing, far }

data class MemberOutlierDto(
    val member: MemberDto,
    val reason: OutlierReason,
    // Distance from the ward center; null when the member has no coordinates.
    val distanceKm: Double?,
)

data class MemberOutliersResponse(
    val centerLat: Double,
    val centerLng: Double,
    val radiusKm: Double,
    val members: List<MemberOutlierDto>,
)

data class GeocodeMembersRequest(
    val memberIds: List<Long> = emptyList(),
    val radiusKm: Double? = null,
)

@Suppress("EnumEntryName")
enum class GeocodeStatus { updated, not_found, too_far, no_address, failed }

// One entry per id submitted to POST .../members/geocode, in request order.
// lat/lng/distanceKm describe what OpenStreetMap returned; they are only
// saved to the member when status is `updated`.
data class GeocodeMemberResult(
    val memberId: Long,
    val status: GeocodeStatus,
    val lat: Double? = null,
    val lng: Double? = null,
    val distanceKm: Double? = null,
    val error: String? = null,
)

data class GeocodeMembersResponse(
    val updated: Int,
    val failed: Int,
    val results: List<GeocodeMemberResult>,
)
