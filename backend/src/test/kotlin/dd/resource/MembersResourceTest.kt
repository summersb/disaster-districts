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
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "Members Test Ward ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createMember(wardId: Int, name: String): Int =
        asAdmin()
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

        asAdmin()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(200)
            .body("name", equalTo(name))
            .body("wardId", equalTo(wardId))
    }

    @Test
    fun `GET member by id returns 404 when missing`() {
        val wardId = createTestWard()

        asAdmin()
            .`when`().get("/wards/$wardId/members/999999")
            .then().statusCode(404)
    }

    @Test
    fun `POST member rejects a duplicate name`() {
        val wardId = createTestWard()
        val name = "Duplicate Member ${System.nanoTime()}"
        createMember(wardId, name)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "familyName": "$name", "formattedAddress": "1 Test St"}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(409)
    }

    @Test
    fun `PUT member updates fields and persists`() {
        val wardId = createTestWard()
        val memberId = createMember(wardId, "Original Member ${System.nanoTime()}")

        asAdmin()
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
        asAdmin()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(200)
            .body("name", equalTo("Updated Member"))
            .body("city", equalTo("Metropolis"))
    }

    @Test
    fun `PUT member returns 404 when missing`() {
        val wardId = createTestWard()

        asAdmin()
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

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$takenName", "familyName": "$takenName", "formattedAddress": "1 Test St"}""")
            .`when`().put("/wards/$wardId/members/$memberId")
            .then().statusCode(409)
    }

    @Test
    fun `DELETE member removes it and 404s on a second delete`() {
        val wardId = createTestWard()
        val memberId = createMember(wardId, "Delete Member ${System.nanoTime()}")

        asAdmin()
            .`when`().delete("/wards/$wardId/members/$memberId")
            .then().statusCode(204)

        asAdmin()
            .`when`().get("/wards/$wardId/members/$memberId")
            .then().statusCode(404)

        asAdmin()
            .`when`().delete("/wards/$wardId/members/$memberId")
            .then().statusCode(404)
    }

    @Test
    fun `POST members bulk reports a status per member`() {
        val wardId = createTestWard()
        val existing = "Bulk Existing ${System.nanoTime()}"
        createMember(wardId, existing)
        val longPhone = "5".repeat(21)

        asAdmin()
            .contentType(ContentType.JSON)
            .body(
                """[
                  {"name": "Bulk New", "familyName": "One", "formattedAddress": "1 Test St"},
                  {"name": "$existing", "familyName": "$existing", "formattedAddress": "1 Test St"},
                  {"name": "Bulk Bad Phone", "familyName": "Two", "formattedAddress": "1 Test St", "phone": "$longPhone"},
                  {"name": "Bulk New", "familyName": "One", "formattedAddress": "1 Test St"},
                  {"name": "Bulk No Address", "familyName": "Three"},
                  {"name": "Bulk Last", "familyName": "Four", "formattedAddress": ""}
                ]""",
            )
            .`when`().post("/wards/$wardId/members/bulk")
            .then().statusCode(207)
            .body("created", equalTo(2))
            .body("skipped", equalTo(2))
            .body("failed", equalTo(2))
            .body("results.index", equalTo(listOf(0, 1, 2, 3, 4, 5)))
            .body(
                "results.status",
                equalTo(listOf("created", "skipped", "failed", "skipped", "failed", "created")),
            )
            .body("results[1].error", equalTo("Already exists"))
            .body("results[2].error", equalTo("Phone is longer than 20 characters"))
            .body("results[4].error", equalTo("Address is required"))

        // Only the two created members (plus the pre-existing one) were saved;
        // the failures didn't roll the others back.
        asAdmin()
            .`when`().get("/wards/$wardId/members")
            .then().statusCode(200)
            .body("size()", equalTo(3))
    }

    @Test
    fun `POST members bulk is forbidden for a plain ward user`() {
        // user1 is a plain `user` in the seeded Sample Ward - allowed to read
        // its members, but not to create them.
        val wardId = given()
            .contentType(ContentType.JSON)
            .body("""{"email": "user1@example.com", "password": "password123"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .extract().jsonPath().getInt("wardId")

        asUser("user1@example.com")
            .contentType(ContentType.JSON)
            .body("""[{"name": "Nope", "familyName": "Nope", "formattedAddress": "1 Test St"}]""")
            .`when`().post("/wards/$wardId/members/bulk")
            .then().statusCode(403)
    }
}
