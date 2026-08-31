package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.everyItem
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Test

// Covers WardJoinRequestResource endpoints the UI calls via useJoinRequests.tsx:
// createRequest (signup's "join a ward" form), getRequests both as the admin
// pending queue and as a user's own request history, and resolveRequest
// (admin approve/reject).
@QuarkusTest
class WardJoinRequestResourceTest {

    private fun createTestWard(): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "Join Request Ward ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createTestUser(): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"email": "join-${System.nanoTime()}@example.com", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createRequest(userId: Int, wardId: Int): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": $wardId}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    @Test
    fun `POST join-requests creates a pending request with ward and user details`() {
        val wardId = createTestWard()
        val userId = createTestUser()

        val requestId = createRequest(userId, wardId)

        asAdmin()
            .`when`().get("/join-requests?userId=$userId")
            .then().statusCode(200)
            .body("find { it.id == $requestId }.status", equalTo("PENDING"))
            .body("find { it.id == $requestId }.wardId", equalTo(wardId))
            .body("find { it.id == $requestId }.userId", equalTo(userId))
    }

    @Test
    fun `POST join-requests returns 404 for an unknown user`() {
        val wardId = createTestWard()

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": 999999, "wardId": $wardId}""")
            .`when`().post("/join-requests")
            .then().statusCode(404)
    }

    @Test
    fun `POST join-requests returns 404 for an unknown ward`() {
        val userId = createTestUser()

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": 999999}""")
            .`when`().post("/join-requests")
            .then().statusCode(404)
    }

    @Test
    fun `POST join-requests rejects a duplicate pending request to the same ward`() {
        val wardId = createTestWard()
        val userId = createTestUser()
        createRequest(userId, wardId)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": $wardId}""")
            .`when`().post("/join-requests")
            .then().statusCode(409)
    }

    @Test
    fun `GET join-requests without userId returns only pending requests for admins`() {
        val wardId = createTestWard()
        val userId = createTestUser()
        val requestId = createRequest(userId, wardId)

        asAdmin()
            .`when`().get("/join-requests")
            .then().statusCode(200)
            .body("id", hasItem(requestId))
            .body("status", everyItem(equalTo("PENDING")))
    }

    @Test
    fun `PUT join-requests approve assigns the ward and role and clears it from the pending queue`() {
        val wardId = createTestWard()
        val userId = createTestUser()
        val requestId = createRequest(userId, wardId)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"approve": true, "assignedRole": "ward_admin"}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(200)
            .body("status", equalTo("APPROVED"))
            .body("assignedRole", equalTo("ward_admin"))

        asAdmin()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("find { it.id == $userId }.roles", hasItem("ward_admin"))

        asAdmin()
            .`when`().get("/join-requests")
            .then().statusCode(200)
            .body("id", not(hasItem(requestId)))
    }

    @Test
    fun `PUT join-requests reject marks it rejected without assigning a ward`() {
        val wardId = createTestWard()
        val userId = createTestUser()
        val requestId = createRequest(userId, wardId)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"approve": false}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(200)
            .body("status", equalTo("REJECTED"))

        asAdmin()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("id", not(hasItem(userId)))
    }
}
