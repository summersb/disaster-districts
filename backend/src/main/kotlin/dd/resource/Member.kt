package dd.resource

import dd.dao.DistrictDao

open class Member (
    var id: Long?,
    var familyName: String,
    var formattedAddress: String?,
    var name: String,
    var address1: String?,
    var address2: String?,
    var city: String?,
    var state: String?,
    var postalCode: String?,
    var phone: String?,
    var lat: Double?,
    var lng: Double?,
    var notes: String?,
    var district: DistrictDao?,
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