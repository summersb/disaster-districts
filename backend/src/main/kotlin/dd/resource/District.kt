package dd.resource

import dd.dao.MemberDao
import dd.dao.WardDao

open class District (
    val id: Long?,
    val name: String?,
    val color: String?,
    val lat: Double? = null,
    val lng: Double? = null,
    val members: MutableList<MemberDao>? = mutableListOf(),
    val ward: WardDao?
)

data class DistrictDto(
    val id: Long?,
    val name: String?,
    val color: String?,
    val lat: Double?,
    val lng: Double?,
    val wardId: Long?,
)
