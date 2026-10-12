package dd.geo

import jakarta.annotation.Priority
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Alternative

// Replaces NominatimGeocoder for every @QuarkusTest so the suite never calls
// the real OpenStreetMap service. The answer is driven by the address text:
//   contains "Nowhere"  -> no match
//   contains "Far Away" -> a match ~1100 km from the requested area
//   contains "Broken"   -> the lookup itself fails
//   anything else       -> a match ~150 m from the requested area
@Alternative
@Priority(1)
@ApplicationScoped
class FakeGeocoder : Geocoder {
    override fun geocode(address: GeoAddress, near: GeoPoint?): GeoPoint? {
        val text = address.freeText
        val origin = near ?: GeoPoint(0.0, 0.0)
        return when {
            text.contains("Nowhere") -> null
            text.contains("Broken") -> throw GeocoderException("OpenStreetMap lookup failed (HTTP 503)")
            text.contains("Far Away") -> GeoPoint(origin.lat + 10.0, origin.lng)
            else -> GeoPoint(origin.lat + 0.001, origin.lng + 0.001)
        }
    }
}
