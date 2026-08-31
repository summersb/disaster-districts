package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.junit.jupiter.api.Test

// Covers MembersResource endpoints the UI calls via useMembers.tsx: getMember,
// createMember, updateMember, deleteMember. GET .../members (list) and the
// leader/assistant-detach-on-delete case are already covered in
// WardsResourceTest and DistrictsResourceTest respectively.
@QuarkusTest
class MembersResourceTest {

    private fun createTestWard(): Int =
        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Members Test Ward ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createMember(wardId: Int, name: String): Int =
        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "familyName": "$name", "formattedAddress": "1 Test St"}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    @Test
    fun `GET member by id returns the member`() {
        val wardId = createTestWard()
        val name = "Get Member Test ${System.nanoTime()}"
        val memberId = createMember(wardId, name)

        given()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(200)
            .body("name", equalTo(name))
            .body("wardId", equalTo(wardId))
    }

    @Test
    fun `GET member by id returns 404 when missing`() {
        val wardId = createTestWard()

        given()
            .`when`().get("/wards/$wardId/members/999999")
            .then().statusCode(404)
    }

    @Test
    fun `POST member rejects a duplicate name`() {
        val wardId = createTestWard()
        val name = "Duplicate Member ${System.nanoTime()}"
        createMember(wardId, name)

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "familyName": "$name", "formattedAddress": "1 Test St"}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(409)
    }

    @Test
    fun `PUT member updates fields and persists`() {
        val wardId = createTestWard()
        val memberId = createMember(wardId, "Original Member ${System.nanoTime()}")

        given()
            .contentType(ContentType.JSON)
            .body(
                """{"name": "Updated Member", "familyName": "Updated", "formattedAddress": "2 New St", "city": "Metropolis"}""",
            )
            .`when`().put("/wards/$wardId/members/$memberId")
            .then().statusCode(200)
            .body("name", equalTo("Updated Member"))
            .body("city", equalTo("Metropolis"))

        // Re-fetch on a fresh request to prove it was actually flushed to the
        // database, not just mutated in memory.
        given()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(200)
            .body("name", equalTo("Updated Member"))
            .body("city", equalTo("Metropolis"))
    }

    @Test
    fun `PUT member returns 404 when missing`() {
        val wardId = createTestWard()

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Ghost", "familyName": "Ghost", "formattedAddress": "1 Test St"}""")
            .`when`().put("/wards/$wardId/members/999999")
            .then().statusCode(404)
    }

    @Test
    fun `PUT member rejects renaming to another member's name`() {
        val wardId = createTestWard()
        val takenName = "Taken Name ${System.nanoTime()}"
        createMember(wardId, takenName)
        val memberId = createMember(wardId, "Renamable Member ${System.nanoTime()}")

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$takenName", "familyName": "X", "formattedAddress": "1 Test St"}""")
            .`when`().put("/wards/$wardId/members/$memberId")
            .then().statusCode(409)
    }

    @Test
    fun `DELETE member removes it and 404s on a second delete`() {
        val wardId = createTestWard()
        val memberId = createMember(wardId, "Delete Member ${System.nanoTime()}")

        given()
            .`when`().delete("/wards/$wardId/members/$memberId")
            .then().statusCode(204)

        given()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(404)

        given()
            .`when`().delete("/wards/$wardId/members/$memberId")
            .then().statusCode(404)
    }
}
