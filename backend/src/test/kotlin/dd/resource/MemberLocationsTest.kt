package dd.resource

import dd.geo.GeoPoint
import dd.geo.distanceKm
import dd.geo.stripUnit
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.closeTo
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

// Covers the "is this member's pin near the ward?" check and the
// OpenStreetMap re-geocode endpoint. The geocoder itself is dd.geo.FakeGeocoder
// here - see that class for how an address maps to a result.
@QuarkusTest
class MemberLocationsTest {

    private val centerLat = 40.0
    private val centerLng = -111.0

    private fun createWard(withCenter: Boolean = true): Int {
        val center = if (withCenter) ""","lat": $centerLat, "lng": $centerLng""" else ""
        return asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "Locations Test Ward ${System.nanoTime()}"$center}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()
    }

    private fun createMember(wardId: Int, name: String, address: String, lat: Double?, lng: Double?): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body(
                """{"name": "$name", "familyName": "Loc", "formattedAddress": "$address",
                    "address1": "$address", "lat": $lat, "lng": $lng}""",
            )
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    @Test
    fun `distanceKm matches a known distance`() {
        // One degree of latitude is ~111.2 km.
        assertEquals(111.2, distanceKm(GeoPoint(40.0, -111.0), GeoPoint(41.0, -111.0)), 0.1)
    }

    @Test
    fun `stripUnit removes a trailing apartment or unit number only`() {
        assertEquals("2130 South Santa Fe", stripUnit("2130 South Santa Fe #9"))
        assertEquals("2130 South Santa Fe Ave", stripUnit("2130 South Santa Fe Ave, Apt 23"))
        assertEquals("500 Main St", stripUnit("500 Main St Unit 4-B"))
        assertEquals("500 Main St", stripUnit("500 Main St Ste. 100"))
        assertEquals("500 Main St", stripUnit("500 Main St spc 12"))
        assertEquals("500 Main St", stripUnit("  500 Main St # 7 "))
        // Nothing to strip, or the designator isn't at the end.
        assertEquals("2246 Buena Creek Rd", stripUnit("2246 Buena Creek Rd"))
        assertEquals("1 Space Center Dr", stripUnit("1 Space Center Dr"))
        assertEquals("12 Suite Life Ln", stripUnit("12 Suite Life Ln"))
        assertEquals("Unit 5", stripUnit("Unit 5"))
    }

    @Test
    fun `outliers lists members that are far from the center or have no coordinates`() {
        val wardId = createWard()
        createMember(wardId, "Near", "1 Main St", centerLat + 0.01, centerLng)
        val farId = createMember(wardId, "Far", "2 Main St", centerLat + 2.0, centerLng)
        val missingId = createMember(wardId, "Missing", "3 Main St", null, null)
        // No address means nothing to look up, so these are never listed -
        // whether their coordinates are missing or far away.
        createMember(wardId, "No Address", "", null, null)
        createMember(wardId, "No Address Far", "", centerLat + 2.0, centerLng)

        asAdmin()
            .`when`().get("/wards/$wardId/members/outliers?radiusKm=20")
            .then().statusCode(200)
            .body("centerLat", equalTo(centerLat.toFloat()))
            .body("radiusKm", equalTo(20.0f))
            .body("members", hasSize<Any>(2))
            // Members without coordinates come first, then furthest first.
            .body("members[0].member.id", equalTo(missingId))
            .body("members[0].reason", equalTo("missing"))
            .body("members[0].distanceKm", nullValue())
            .body("members[1].member.id", equalTo(farId))
            .body("members[1].reason", equalTo("far"))
            .body("members[1].distanceKm.toDouble()", closeTo(222.4, 0.5))

        // A radius wide enough to include the far member leaves only the one
        // with no coordinates.
        asAdmin()
            .`when`().get("/wards/$wardId/members/outliers?radiusKm=500")
            .then().statusCode(200)
            .body("members", hasSize<Any>(1))
    }

    @Test
    fun `outliers and geocode need the ward to have a center`() {
        val wardId = createWard(withCenter = false)
        val memberId = createMember(wardId, "Anyone", "1 Main St", 10.0, 10.0)

        asAdmin()
            .`when`().get("/wards/$wardId/members/outliers")
            .then().statusCode(409)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [$memberId]}""")
            .`when`().post("/wards/$wardId/members/geocode")
            .then().statusCode(409)
    }

    @Test
    fun `geocode updates members whose address resolves near the ward and reports the rest`() {
        val wardId = createWard()
        val otherWardId = createWard()
        val fixable = createMember(wardId, "Fixable", "10 Main St", centerLat + 2.0, centerLng)
        val unknown = createMember(wardId, "Unknown", "Nowhere Rd", centerLat + 2.0, centerLng)
        val farAway = createMember(wardId, "Elsewhere", "Far Away Ave", centerLat + 2.0, centerLng)
        val broken = createMember(wardId, "Broken", "Broken Blvd", centerLat + 2.0, centerLng)
        val noAddress = createMember(wardId, "Blank", "", null, null)
        val otherWard = createMember(otherWardId, "Other", "1 Main St", null, null)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [$fixable, $unknown, $farAway, $broken, $noAddress, $otherWard], "radiusKm": 20}""")
            .`when`().post("/wards/$wardId/members/geocode")
            .then().statusCode(207)
            .body("updated", equalTo(1))
            .body("failed", equalTo(5))
            .body("results.memberId", equalTo(listOf(fixable, unknown, farAway, broken, noAddress, otherWard)))
            .body(
                "results.status",
                equalTo(listOf("updated", "not_found", "too_far", "failed", "no_address", "failed")),
            )
            .body("results[0].lat.toDouble()", closeTo(centerLat + 0.001, 0.00001))
            .body("results[3].error", equalTo("OpenStreetMap lookup failed (HTTP 503)"))
            .body("results[5].error", equalTo("Member not found"))

        // Only the resolvable member moved; the too-far match was not saved.
        asAdmin()
            .`when`().get("/wards/$wardId/members/$fixable")
            .then().statusCode(200)
            .body("lat.toDouble()", closeTo(centerLat + 0.001, 0.00001))
            .body("lng.toDouble()", closeTo(centerLng + 0.001, 0.00001))
        asAdmin()
            .`when`().get("/wards/$wardId/members/$farAway")
            .then().statusCode(200)
            .body("lat.toDouble()", closeTo(centerLat + 2.0, 0.00001))

        // ...so it no longer shows up as an outlier.
        asAdmin()
            .`when`().get("/wards/$wardId/members/outliers?radiusKm=20")
            .then().statusCode(200)
            .body("members", hasSize<Any>(3))
            .body("members.member.id", not(hasItem(fixable)))
            .body("members.member.id", not(hasItem(noAddress)))
    }

    @Test
    fun `geocode rejects oversized batches`() {
        val wardId = createWard()
        val ids = (1..26).joinToString(",")

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [$ids]}""")
            .`when`().post("/wards/$wardId/members/geocode")
            .then().statusCode(400)
    }

    @Test
    fun `geocode is forbidden for a plain ward user`() {
        val wardId = given()
            .contentType(ContentType.JSON)
            .body("""{"email": "user1@example.com", "password": "password123"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .extract().jsonPath().getInt("wardId")

        asUser("user1@example.com")
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [1]}""")
            .`when`().post("/wards/$wardId/members/geocode")
            .then().statusCode(403)
    }
}
