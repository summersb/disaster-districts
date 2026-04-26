package dd.resource

import dd.dao.DistrictDao

open class Ward(
    var id: Long?,
    var name: String,
    var lat: Double? = null,
    var lng: Double? = null,
    var districts: MutableList<DistrictDao>? = mutableListOf(),
)

data class WardDto(
    val id: Long?,
    val name: String,
    val lat: Double? = null,
    val lng: Double? = null,
)
