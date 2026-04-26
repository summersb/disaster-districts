package dd.resource

import dd.dao.MemberDao
import dd.dao.WardDao

open class District (
    val id: Long? = null,
    val name: String? = null,
    val color: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val members: MutableList<MemberDao>? = null,
    val ward: WardDao? = null,
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
