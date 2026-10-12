package dd.geo

import com.fasterxml.jackson.databind.ObjectMapper
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.net.InetSocketAddress
import java.net.URLDecoder
import java.util.Optional
import java.util.concurrent.CopyOnWriteArrayList

// Runs NominatimGeocoder against a local stand-in for the search API, so the
// request shape, fallback, caching and pacing are checked without ever
// calling the real OpenStreetMap service.
class NominatimGeocoderTest {

    private data class Seen(val params: Map<String, String>, val userAgent: String?, val at: Long)

    private lateinit var server: HttpServer
    private val seen = CopyOnWriteArrayList<Seen>()

    // What the stub answers, given the decoded query parameters.
    private var respond: (Map<String, String>) -> Pair<Int, String> = { 200 to "[]" }

    @BeforeEach
    fun start() {
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/search") { exchange ->
            val params = exchange.requestURI.rawQuery.split("&").associate {
                val (k, v) = it.split("=", limit = 2)
                k to URLDecoder.decode(v, Charsets.UTF_8)
            }
            seen += Seen(params, exchange.requestHeaders.getFirst("User-Agent"), System.currentTimeMillis())
            val (status, body) = respond(params)
            val bytes = body.toByteArray()
            exchange.sendResponseHeaders(status, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
    }

    @AfterEach
    fun stop() = server.stop(0)

    private fun geocoder(minIntervalMs: Long = 0) = NominatimGeocoder(
        baseUrl = "http://127.0.0.1:${server.address.port}",
        userAgent = "DisasterDistrictsTest/1.0",
        contactEmail = Optional.of("ops@example.com"),
        minIntervalMs = minIntervalMs,
        objectMapper = ObjectMapper(),
    )

    private val match = """[{"lat": "33.183772", "lon": "-117.203665"}]"""
    private val address = GeoAddress(
        freeText = "2246 Buena Creek Rd, Vista, CA 92084-7318",
        street = "2246 Buena Creek Rd",
        postalCode = "92084-7318",
    )

    @Test
    fun `free-text match is returned with an identifying request`() {
        respond = { 200 to match }

        val point = geocoder().geocode(address, GeoPoint(33.2, -117.2))

        assertEquals(GeoPoint(33.183772, -117.203665), point)
        assertEquals(1, seen.size)
        assertEquals("2246 Buena Creek Rd, Vista, CA 92084-7318", seen[0].params["q"])
        assertEquals("jsonv2", seen[0].params["format"])
        assertEquals("ops@example.com", seen[0].params["email"])
        assertEquals("DisasterDistrictsTest/1.0", seen[0].userAgent)
        assertTrue(seen[0].params.containsKey("viewbox"))
    }

    @Test
    fun `falls back to street and 5-digit postcode when free text finds nothing`() {
        respond = { params -> 200 to if (params.containsKey("q")) "[]" else match }

        val point = geocoder().geocode(address)

        assertEquals(GeoPoint(33.183772, -117.203665), point)
        assertEquals(2, seen.size)
        assertEquals("2246 Buena Creek Rd", seen[1].params["street"])
        assertEquals("92084", seen[1].params["postalcode"])
        assertNull(seen[1].params["q"])
    }

    @Test
    fun `no fallback without a street and postcode, and misses are cached`() {
        val geocoder = geocoder()
        val freeTextOnly = GeoAddress(freeText = "Somewhere Unknown")

        assertNull(geocoder.geocode(freeTextOnly))
        assertNull(geocoder.geocode(freeTextOnly))

        assertEquals(1, seen.size)
    }

    @Test
    fun `requests are spaced by the minimum interval, including the fallback`() {
        val geocoder = geocoder(minIntervalMs = 300)

        geocoder.geocode(address)
        geocoder.geocode(address.copy(freeText = "1 Other St, Vista, CA", street = null))

        assertEquals(3, seen.size)
        // Allow a few ms of timer slack either side of the 300 ms spacing.
        assertTrue(seen[1].at - seen[0].at >= 290, "fallback followed too soon")
        assertTrue(seen[2].at - seen[1].at >= 290, "next address followed too soon")
    }

    @Test
    fun `rate limiting and server errors surface as failures, not as no match`() {
        respond = { 429 to "" }
        val limited = assertThrows(GeocoderException::class.java) { geocoder().geocode(address) }
        assertTrue(limited.message!!.contains("rate limiting"))

        respond = { 503 to "" }
        val down = assertThrows(GeocoderException::class.java) { geocoder().geocode(address) }
        assertTrue(down.message!!.contains("HTTP 503"))
    }
}
