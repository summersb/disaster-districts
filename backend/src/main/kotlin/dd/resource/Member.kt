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