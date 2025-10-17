package dd.resource

import dd.dao.DistrictDao

open class Ward (
    var id: Long?,
    var name: String,
    var districts: MutableList<DistrictDao>? = mutableListOf()
)