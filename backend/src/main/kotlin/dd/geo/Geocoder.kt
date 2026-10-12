package dd.geo

import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

data class GeoPoint(val lat: Double, val lng: Double)

/** Great-circle (haversine) distance between two points, in kilometres. */
fun distanceKm(a: GeoPoint, b: GeoPoint): Double {
    val earthRadiusKm = 6371.0088
    val dLat = Math.toRadians(b.lat - a.lat)
    val dLng = Math.toRadians(b.lng - a.lng)
    val h = sin(dLat / 2).pow(2) +
        cos(Math.toRadians(a.lat)) * cos(Math.toRadians(b.lat)) * sin(dLng / 2).pow(2)
    return 2 * earthRadiusKm * asin(sqrt(h))
}

class GeocoderException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/** Turns a postal address into coordinates. */
interface Geocoder {
    /**
     * Looks [address] up, preferring matches around [near] when given.
     * Returns null when the address has no match; throws [GeocoderException]
     * when the lookup itself fails.
     */
    fun geocode(address: String, near: GeoPoint? = null): GeoPoint?
}
