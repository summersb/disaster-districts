package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.junit.jupiter.api.Test

// Regression tests for DistrictsResource/MembersResource: both are JAX-RS
// sub-resource locators returned via `new` from WardsResource rather than
// CDI, so @Transactional never gets woven in. Writes must open a transaction
// programmatically (see QuarkusTransaction.call in the resource classes) or
// they either throw TransactionRequiredException (bulk update/delete
// queries) or silently fail to persist (plain entity field mutations).
@QuarkusTest
class DistrictsResourceTest {

    private fun createTestWard(): Int =
        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Districts Test Ward ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createDistrict(wardId: Int, name: String): Int =
        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name"}""")
            .`when`().post("/wards/$wardId/districts")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createMember(wardId: Int, name: String): Int =
        given()
            .contentType(ContentType.JSON)
            .body(
                """{"name": "$name", "familyName": "$name", "formattedAddress": "1 Test St"}""",
            )
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    @Test
    fun `updating a district's name actually persists`() {
        val wardId = createTestWard()
        val districtId = createDistrict(wardId, "Original Name")

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Renamed District"}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
            .body("name", equalTo("Renamed District"))

        // Re-fetch on a fresh request/transaction to prove it was actually
        // flushed to the database, not just mutated in memory.
        given()
            .`when`().get("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
            .body("name", equalTo("Renamed District"))
    }

    @Test
    fun `updating a district's memberIds reassigns members instead of throwing`() {
        val wardId = createTestWard()
        val districtId = createDistrict(wardId, "Roster District")
        val memberId = createMember(wardId, "Test Member")

        given()
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [$memberId]}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)

        given()
            .`when`().get("/wards/$wardId/members")
            .then().statusCode(200)
            .body(
                "find { it.id == $memberId }.district.id",
                equalTo(districtId),
            )
    }

    @Test
    fun `deleting a district detaches its members and removes it`() {
        val wardId = createTestWard()
        val districtId = createDistrict(wardId, "Temp District")
        val memberId = createMember(wardId, "Detach Me")

        given()
            .contentType(ContentType.JSON)
            .body("""{"memberIds": [$memberId]}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)

        given()
            .`when`().delete("/wards/$wardId/districts/$districtId")
            .then().statusCode(204)

        given()
            .`when`().get("/wards/$wardId/districts/$districtId")
            .then().statusCode(404)

        given()
            .`when`().get("/wards/$wardId/members")
            .then().statusCode(200)
            .body("find { it.id == $memberId }.district", equalTo(null))
    }

    @Test
    fun `deleting a member who leads a district clears the reference instead of failing`() {
        val wardId = createTestWard()
        val districtId = createDistrict(wardId, "Leader Test District")
        val memberId = createMember(wardId, "Leader Test Member")

        given()
            .contentType(ContentType.JSON)
            .body("""{"leaderId": $memberId}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
            .body("leaderId", equalTo(memberId))

        given()
            .`when`().delete("/wards/$wardId/members/$memberId")
            .then().statusCode(204)

        given()
            .`when`().get("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
            .body("leaderId", equalTo(null))

        given()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(404)
    }
}
