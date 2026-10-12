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

/**
 * An address to look up. [freeText] is the whole address as one line; [street]
 * (house number + street name) and [postalCode] are the same address's parts,
 * when known, for geocoders that can search by field.
 */
data class GeoAddress(
    val freeText: String,
    val street: String? = null,
    val postalCode: String? = null,
)

// A unit designator at the end of a street line: "#9", "Apt 23", "Unit 4-B",
// "Ste. 100", "Spc 12" ... optionally preceded by a comma.
private val TRAILING_UNIT = Regex(
    """[\s,]*(?:#\s*[\w-]+|\b(?:apt|apartment|unit|ste|suite|spc|space|lot|trlr|trailer|bldg|building|rm|room|fl|floor)\b\.?\s*#?\s*[\w-]+)\s*$""",
    RegexOption.IGNORE_CASE,
)

/**
 * Drops an apartment/unit/space number from the end of a street line
 * ("2130 South Santa Fe #9" -> "2130 South Santa Fe"). Map data is addressed
 * to the building, so a geocoder finds nothing while the unit is attached.
 */
fun stripUnit(street: String): String {
    val stripped = street.trim().replace(TRAILING_UNIT, "").trim()
    // Never strip the whole line (e.g. a street literally called "Unit 5").
    return stripped.ifEmpty { street.trim() }
}

/** Turns a postal address into coordinates. */
interface Geocoder {
    /**
     * Looks [address] up, preferring matches around [near] when given.
     * Returns null when the address has no match; throws [GeocoderException]
     * when the lookup itself fails.
     */
    fun geocode(address: GeoAddress, near: GeoPoint? = null): GeoPoint?
}
