package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.everyItem
import org.junit.jupiter.api.Test

// Exercises the authorization layer itself (SecurityIdentityAugmentor +
// dd.security.Authz), separate from the CRUD-correctness tests in the
// per-resource test classes, all of which run as the system admin and so
// never touch these boundaries.
@QuarkusTest
class AuthorizationTest {

    private fun createWard(name: String = "Authz Test Ward ${System.nanoTime()}"): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createUser(email: String = "authz-${System.nanoTime()}@example.com"): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    /** Creates a fresh user and makes them a ward_admin of [wardId]. */
    private fun createWardAdmin(wardId: Int): Pair<Int, String> {
        val email = "wardadmin-${System.nanoTime()}@example.com"
        val userId = createUser(email)
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": ["ward_admin"], "wardId": $wardId}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
        return userId to email
    }

    @Test
    fun `GET wards with no token is unauthorized`() {
        given()
            .`when`().get("/wards")
            .then().statusCode(401)
    }

    @Test
    fun `POST wards as a plain user is forbidden`() {
        asUser("user1@example.com")
            .contentType(ContentType.JSON)
            .body("""{"name": "Should Not Be Created ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(403)
    }

    @Test
    fun `a plain user cannot read another ward's members`() {
        val otherWardId = createWard()

        // user1@example.com is seeded into Sample Ward, not this new one.
        asUser("user1@example.com")
            .`when`().get("/wards/$otherWardId/members")
            .then().statusCode(403)
    }

    @Test
    fun `a ward_admin can manage their own ward but not another ward`() {
        val ownWardId = createWard()
        val otherWardId = createWard()
        val (_, email) = createWardAdmin(ownWardId)

        asUser(email)
            .contentType(ContentType.JSON)
            .body("""{"name": "Own Ward District ${System.nanoTime()}"}""")
            .`when`().post("/wards/$ownWardId/districts")
            .then().statusCode(201)

        asUser(email)
            .contentType(ContentType.JSON)
            .body("""{"name": "Other Ward District ${System.nanoTime()}"}""")
            .`when`().post("/wards/$otherWardId/districts")
            .then().statusCode(403)
    }

    @Test
    fun `a ward_admin's join-request queue is scoped to their own ward`() {
        val wardAId = createWard()
        val wardBId = createWard()
        val (_, wardAAdminEmail) = createWardAdmin(wardAId)

        val applicantId = createUser()
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": $applicantId, "wardId": $wardBId}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)

        asUser(wardAAdminEmail)
            .`when`().get("/join-requests")
            .then().statusCode(200)
            .body("wardId", everyItem(equalTo(wardAId)))
    }

    @Test
    fun `a ward_admin cannot approve a join request for another ward`() {
        val wardAId = createWard()
        val wardBId = createWard()
        val (_, wardAAdminEmail) = createWardAdmin(wardAId)

        val applicantId = createUser()
        val requestId = asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"userId": $applicantId, "wardId": $wardBId}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

        asUser(wardAAdminEmail)
            .contentType(ContentType.JSON)
            .body("""{"approve": true}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(403)
    }

    @Test
    fun `a ward_admin cannot grant themselves system admin via updateUser`() {
        val wardId = createWard()
        val (userId, email) = createWardAdmin(wardId)

        asUser(email)
            .contentType(ContentType.JSON)
            .body("""{"roles": ["admin"]}""")
            .`when`().put("/users/$userId")
            .then().statusCode(403)
    }

    @Test
    fun `a ward_admin cannot move a user to a different ward`() {
        val ownWardId = createWard()
        val otherWardId = createWard()
        val (_, wardAdminEmail) = createWardAdmin(ownWardId)

        val memberId = createUser()
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": ["user"], "wardId": $ownWardId}""")
            .`when`().put("/users/$memberId")
            .then().statusCode(200)

        asUser(wardAdminEmail)
            .contentType(ContentType.JSON)
            .body("""{"wardId": $otherWardId}""")
            .`when`().put("/users/$memberId")
            .then().statusCode(403)
    }

    @Test
    fun `a ward admin can add a user who has no ward, but only to their own ward`() {
        val wardId = createWard()
        val otherWardId = createWard()
        val (_, adminEmail) = createWardAdmin(wardId)
        val newcomer = createUser()

        // Not into someone else's ward...
        asUser(adminEmail)
            .contentType(ContentType.JSON)
            .body("""{"wardId": $otherWardId}""")
            .`when`().put("/users/$newcomer")
            .then().statusCode(403)

        // ...but into their own.
        asUser(adminEmail)
            .contentType(ContentType.JSON)
            .body("""{"wardId": $wardId}""")
            .`when`().put("/users/$newcomer")
            .then().statusCode(200)
            .body("wardId", equalTo(wardId))
            .body("roles", equalTo(listOf("user")))

        asUser(adminEmail)
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("id", org.hamcrest.Matchers.hasItem(newcomer))
    }

    @Test
    fun `a ward admin cannot take a user from another ward or touch a system admin`() {
        val wardId = createWard()
        val otherWardId = createWard()
        val (_, adminEmail) = createWardAdmin(wardId)
        val (otherWardUser, _) = createWardAdmin(otherWardId)
        val systemAdminId = asAdmin()
            .`when`().get("/users")
            .then().statusCode(200)
            .extract().jsonPath().getInt("find { it.email == 'admin@example.com' }.id")

        asUser(adminEmail)
            .contentType(ContentType.JSON)
            .body("""{"wardId": $wardId}""")
            .`when`().put("/users/$otherWardUser")
            .then().statusCode(403)

        // The system admin has no ward either, but is not up for grabs.
        asUser(adminEmail)
            .contentType(ContentType.JSON)
            .body("""{"wardId": $wardId}""")
            .`when`().put("/users/$systemAdminId")
            .then().statusCode(403)
        asAdmin()
            .`when`().get("/users/$systemAdminId")
            .then().statusCode(200)
            .body("roles", equalTo(listOf("admin")))
    }

    @Test
    fun `only real roles can be stored - the retired district_admin is dropped`() {
        val wardId = createWard()
        val userId = createUser()
        asAdmin().contentType(ContentType.JSON).body("""{"roles": ["user"], "wardId": $wardId}""")
            .`when`().put("/users/$userId").then().statusCode(200)

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": ["district_admin"]}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("roles", equalTo(listOf("user")))

        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": ["ward_admin", "district_admin", "made_up"]}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("roles", equalTo(listOf("ward_admin")))
    }
}
