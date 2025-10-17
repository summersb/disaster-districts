package dd.resource

import dd.dao.MemberDao
import dd.dao.WardDao

open class District (
    val id: Long?,
    val name: String?,
    val color: String?,
    val members: MutableList<MemberDao>? = mutableListOf(),
    val ward: WardDao?
)