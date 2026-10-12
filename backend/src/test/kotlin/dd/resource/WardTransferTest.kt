package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.notNullValue
import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Test

// Round-trips a ward through GET .../export and POST .../import.
@QuarkusTest
class WardTransferTest {

    private fun createWard(body: String): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body(body)
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createMember(wardId: Int, name: String, extra: String = ""): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "familyName": "Transfer", "formattedAddress": "1 Test St"$extra}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    /** A ward with a leader, two districts and three members (one unassigned). */
    private fun sourceWard(): Int {
        val wardId = createWard("""{"name": "Export Source ${System.nanoTime()}", "lat": 33.1, "lng": -117.2}""")
        val leader = createMember(wardId, "Leader", ""","phone": "760-555-0001", "notes": "has a generator", "lat": 33.11, "lng": -117.21""")
        val helper = createMember(wardId, "Helper")
        createMember(wardId, "Loose")
        asAdmin().contentType(ContentType.JSON).body("""{"leaderId": $leader}""")
            .`when`().put("/wards/$wardId").then().statusCode(200)
        asAdmin().contentType(ContentType.JSON)
            .body("""{"name": "North", "color": "Red", "lat": 33.2, "lng": -117.3, "leaderId": $leader, "assistantId": $helper, "memberIds": [$leader, $helper]}""")
            .`when`().post("/wards/$wardId/districts").then().statusCode(201)
        asAdmin().contentType(ContentType.JSON)
            .body("""{"name": "South", "color": "Green"}""")
            .`when`().post("/wards/$wardId/districts").then().statusCode(201)
        return wardId
    }

    private fun export(wardId: Int): String =
        asAdmin()
            .`when`().get("/wards/$wardId/export")
            .then().statusCode(200)
            .body("format", equalTo("disaster-districts-ward"))
            .body("version", equalTo(1))
            .body("members", hasSize<Any>(3))
            .body("districts", hasSize<Any>(2))
            .body("ward.leaderId", notNullValue())
            .extract().asString()

    @Test
    fun `an exported ward imports into another ward with everything linked up`() {
        val file = export(sourceWard())
        val targetName = "Import Target ${System.nanoTime()}"
        val targetId = createWard("""{"name": "$targetName"}""")

        asAdmin()
            .contentType(ContentType.JSON)
            .body(file)
            .`when`().post("/wards/$targetId/import")
            .then().statusCode(200)
            .body("membersCreated", equalTo(3))
            .body("membersUpdated", equalTo(0))
            .body("districtsCreated", equalTo(2))
            .body("districtsUpdated", equalTo(0))

        // The ward keeps its own name but takes the center and a leader.
        asAdmin()
            .`when`().get("/wards/$targetId")
            .then().statusCode(200)
            .body("name", equalTo(targetName))
            .body("lat", equalTo(33.1f))
            .body("leaderId", notNullValue())

        val members = asAdmin().`when`().get("/wards/$targetId/members").then().statusCode(200).extract().jsonPath()
        val leaderId = members.getInt("find { it.name == 'Leader' }.id")
        val helperId = members.getInt("find { it.name == 'Helper' }.id")
        asAdmin()
            .`when`().get("/wards/$targetId/members")
            .then()
            .body("find { it.name == 'Leader' }.phone", equalTo("760-555-0001"))
            .body("find { it.name == 'Leader' }.notes", equalTo("has a generator"))
            .body("find { it.name == 'Leader' }.district.name", equalTo("North"))
            .body("find { it.name == 'Helper' }.district.name", equalTo("North"))
            .body("find { it.name == 'Loose' }.district", nullValue())
        asAdmin()
            .`when`().get("/wards/$targetId/districts")
            .then().statusCode(200)
            .body("size()", equalTo(2))
            .body("find { it.name == 'North' }.color", equalTo("Red"))
            .body("find { it.name == 'North' }.leaderId", equalTo(leaderId))
            .body("find { it.name == 'North' }.assistantId", equalTo(helperId))
            .body("find { it.name == 'South' }.leaderId", nullValue())
        asAdmin().`when`().get("/wards/$targetId").then().body("leaderId", equalTo(leaderId))

        // Importing the same file again updates in place - no duplicates.
        asAdmin()
            .contentType(ContentType.JSON)
            .body(file)
            .`when`().post("/wards/$targetId/import")
            .then().statusCode(200)
            .body("membersCreated", equalTo(0))
            .body("membersUpdated", equalTo(3))
            .body("districtsCreated", equalTo(0))
            .body("districtsUpdated", equalTo(2))
        asAdmin().`when`().get("/wards/$targetId/members").then().body("size()", equalTo(3))
    }

    @Test
    fun `import leaves members and districts the file does not mention alone`() {
        val file = export(sourceWard())
        val targetId = createWard("""{"name": "Merge Target ${System.nanoTime()}"}""")
        val keeper = createMember(targetId, "Already Here")

        asAdmin().contentType(ContentType.JSON).body(file)
            .`when`().post("/wards/$targetId/import").then().statusCode(200)

        asAdmin().`when`().get("/wards/$targetId/members").then().body("size()", equalTo(4))
        asAdmin().`when`().get("/wards/$targetId/members/$keeper").then().statusCode(200)
    }

    @Test
    fun `import rejects other files and invalid members without changing anything`() {
        val targetId = createWard("""{"name": "Reject Target ${System.nanoTime()}"}""")

        asAdmin().contentType(ContentType.JSON).body("""{"format": "something-else", "version": 1}""")
            .`when`().post("/wards/$targetId/import")
            .then().statusCode(400)
            .body("error", equalTo("This is not a ward export file"))

        val longPhone = "5".repeat(21)
        asAdmin().contentType(ContentType.JSON)
            .body(
                """{"format": "disaster-districts-ward", "version": 1,
                    "members": [
                      {"id": 1, "familyName": "Good", "name": "One", "formattedAddress": "1 St"},
                      {"id": 2, "familyName": "Bad", "name": "Two", "formattedAddress": "2 St", "phone": "$longPhone"}
                    ]}""",
            )
            .`when`().post("/wards/$targetId/import")
            .then().statusCode(400)
            .body("error", equalTo("Member 2 (Bad, Two): Phone is longer than 20 characters"))

        asAdmin().`when`().get("/wards/$targetId/members").then().body("size()", equalTo(0))
    }

    @Test
    fun `export and import are limited to ward managers`() {
        val wardId = given()
            .contentType(ContentType.JSON)
            .body("""{"email": "user2@example.com", "password": "password123"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .extract().jsonPath().getInt("wardId")

        asUser("user2@example.com")
            .`when`().get("/wards/$wardId/export")
            .then().statusCode(403)
        asUser("user2@example.com")
            .contentType(ContentType.JSON)
            .body("""{"format": "disaster-districts-ward", "version": 1}""")
            .`when`().post("/wards/$wardId/import")
            .then().statusCode(403)
    }
}
