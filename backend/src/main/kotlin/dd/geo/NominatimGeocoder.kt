package dd.geo

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Collections
import java.util.Optional

/**
 * Geocodes through OpenStreetMap's Nominatim search API.
 *
 * Written to stay inside the public instance's usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/):
 *  - at most one request per second, from a single thread: every call goes
 *    through [throttle], which is shared by the whole application;
 *  - an identifying User-Agent rather than a stock HTTP-library one;
 *  - results are cached, so the same address is never requested twice;
 *  - an address costs at most two requests (free text, then one fallback);
 *  - no bulk geocoding: callers only send the handful of members a user
 *    picked (MembersResource caps each request).
 * Results are OpenStreetMap data (ODbL), so any screen showing them must
 * credit "© OpenStreetMap contributors".
 *
 * Point dd.geocoder.base-url at a self-hosted or commercial Nominatim
 * instance if heavier use is ever needed.
 */
@ApplicationScoped
class NominatimGeocoder(
    @ConfigProperty(name = "dd.geocoder.base-url", defaultValue = "https://nominatim.openstreetmap.org")
    val baseUrl: String,
    @ConfigProperty(name = "dd.geocoder.user-agent", defaultValue = "DisasterDistricts/1.0 (ward membership manager)")
    val userAgent: String,
    @ConfigProperty(name = "dd.geocoder.contact-email")
    val contactEmail: Optional<String>,
    @ConfigProperty(name = "dd.geocoder.min-interval-ms", defaultValue = "1100")
    val minIntervalMs: Long,
    val objectMapper: ObjectMapper,
) : Geocoder {

    private val http: HttpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build()
    private val lock = Any()
    private var lastRequestAt = 0L

    // Small LRU keyed by the normalized query. Misses (no match) are cached
    // too, as Optional.empty, so a bad address isn't re-requested either.
    private val cache: MutableMap<String, Optional<GeoPoint>> = Collections.synchronizedMap(
        object : LinkedHashMap<String, Optional<GeoPoint>>(256, 0.75f, true) {
            override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Optional<GeoPoint>>) = size > 2000
        },
    )

    override fun geocode(address: GeoAddress, near: GeoPoint?): GeoPoint? {
        val query = address.freeText.normalized()
        if (query.isEmpty()) return null
        val street = address.street?.normalized().orEmpty()
        val postalCode = address.postalCode?.normalized().orEmpty().replace(ZIP_PLUS_4, "$1")
        val key = listOf(query, street, postalCode).joinToString("|").lowercase() +
            "|" + (near?.let { "%.1f,%.1f".format(it.lat, it.lng) } ?: "")
        cache[key]?.let { return it.orElse(null) }

        // One request at a time, application-wide; the lock is held through
        // the HTTP calls so concurrent callers queue instead of overlapping.
        synchronized(lock) {
            cache[key]?.let { return it.orElse(null) }
            var result = search(listOf("q" to query), near)
            // Free-text search needs every word to fit the map's own place
            // hierarchy, so it misses addresses whose postal city isn't the
            // boundary they sit in (e.g. "Vista" for a road just outside the
            // city limits). Street + postcode as separate fields finds those,
            // at the cost of one more rate-limited request.
            if (result == null && street.isNotEmpty() && postalCode.isNotEmpty()) {
                result = search(listOf("street" to street, "postalcode" to postalCode), near)
            }
            cache[key] = Optional.ofNullable(result)
            return result
        }
    }

    private fun String.normalized() = trim().replace(Regex("\\s+"), " ")

    // Every request to the service goes through here, so they are always at
    // least minIntervalMs apart.
    private fun throttle() {
        val wait = lastRequestAt + minIntervalMs - System.currentTimeMillis()
        if (wait > 0) Thread.sleep(wait)
    }

    private fun search(terms: List<Pair<String, String>>, near: GeoPoint?): GeoPoint? {
        throttle()
        try {
            return send(terms, near)
        } finally {
            lastRequestAt = System.currentTimeMillis()
        }
    }

    private fun send(terms: List<Pair<String, String>>, near: GeoPoint?): GeoPoint? {
        val params = mutableListOf("format" to "jsonv2", "limit" to "1")
        params += terms
        // A viewbox without `bounded` only ranks nearby matches first - an
        // address that really is elsewhere is still found.
        near?.let {
            val box = 0.5
            params += "viewbox" to "${it.lng - box},${it.lat + box},${it.lng + box},${it.lat - box}"
        }
        contactEmail.filter { it.isNotBlank() }.ifPresent { params += "email" to it }
        val queryString = params.joinToString("&") { (k, v) -> "$k=${URLEncoder.encode(v, Charsets.UTF_8)}" }

        val request = HttpRequest.newBuilder(URI.create("${baseUrl.trimEnd('/')}/search?$queryString"))
            .header("User-Agent", userAgent)
            .header("Accept", "application/json")
            .timeout(Duration.ofSeconds(20))
            .GET()
            .build()
        val response = try {
            http.send(request, HttpResponse.BodyHandlers.ofString())
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            throw GeocoderException("OpenStreetMap lookup was interrupted", e)
        } catch (e: Exception) {
            throw GeocoderException("OpenStreetMap lookup failed: ${e.message}", e)
        }
        if (response.statusCode() == 429) {
            throw GeocoderException("OpenStreetMap is rate limiting requests - try again later")
        }
        if (response.statusCode() != 200) {
            throw GeocoderException("OpenStreetMap lookup failed (HTTP ${response.statusCode()})")
        }
        val first = objectMapper.readTree(response.body()).firstOrNull() ?: return null
        val lat = first.get("lat")?.asText()?.toDoubleOrNull()
        val lng = first.get("lon")?.asText()?.toDoubleOrNull()
        return if (lat != null && lng != null) GeoPoint(lat, lng) else null
    }

    private companion object {
        // US ZIP+4 ("92084-7318"): the search only knows the 5-digit part.
        val ZIP_PLUS_4 = Regex("^(\\d{5})-\\d{4}$")
    }
}
