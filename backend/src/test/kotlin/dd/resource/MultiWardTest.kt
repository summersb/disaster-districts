package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Test

// One account belonging to several wards, with a different standing in each.
@QuarkusTest
class MultiWardTest {

    private fun createWard(tag: String): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "Multi $tag ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createUser(): Pair<Int, String> {
        val email = "multi-${System.nanoTime()}@example.com"
        val id = asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()
        return id to email
    }

    private fun createMember(wardId: Int, name: String): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "familyName": "Multi", "formattedAddress": "1 Test St"}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun setRoles(userId: Int, wardId: Int, roles: String) =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": $roles, "wardId": $wardId}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)

    @Test
    fun `a user can be ward admin of one ward and an ordinary member of another`() {
        val managed = createWard("Managed")
        val joined = createWard("Joined")
        val (userId, email) = createUser()
        setRoles(userId, managed, """["ward_admin"]""")
        setRoles(userId, joined, """["user"]""")

        // Both wards are reported, each with its own role - at sign-in and
        // when the app refreshes its session.
        given().contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .body("wards", hasSize<Any>(2))
            .body("wards.find { it.id == $managed }.roles", equalTo(listOf("ward_admin")))
            .body("wards.find { it.id == $joined }.roles", equalTo(listOf("user")))
        asUser(email)
            .`when`().get("/auth/me")
            .then().statusCode(200)
            .body("email", equalTo(email))
            .body("token", nullValue())
            .body("wards.id", hasItem(joined))

        // They can read both wards...
        asUser(email).`when`().get("/wards/$managed/members").then().statusCode(200)
        asUser(email).`when`().get("/wards/$joined/members").then().statusCode(200)

        // ...but manage only the one they administer.
        val body = """{"name": "New", "familyName": "Multi", "formattedAddress": "2 Test St"}"""
        asUser(email).contentType(ContentType.JSON).body(body)
            .`when`().post("/wards/$managed/members").then().statusCode(201)
        asUser(email).contentType(ContentType.JSON).body(body)
            .`when`().post("/wards/$joined/members").then().statusCode(403)
        asUser(email).`when`().get("/wards/$managed/users").then().statusCode(200)
        asUser(email).`when`().get("/wards/$joined/users").then().statusCode(403)

        // A ward's user list shows the role held in that ward, not elsewhere.
        asAdmin()
            .`when`().get("/wards/$joined/users")
            .then().statusCode(200)
            .body("find { it.id == $userId }.roles", equalTo(listOf("user")))
    }

    @Test
    fun `removing a user from one ward leaves their other ward alone`() {
        val first = createWard("First")
        val second = createWard("Second")
        val (userId, _) = createUser()
        setRoles(userId, first, """["ward_admin"]""")
        setRoles(userId, second, """["user"]""")

        asAdmin().contentType(ContentType.JSON)
            .body("""{"removeFromWard": true, "wardId": $second}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("wards", hasSize<Any>(1))
            .body("wards[0].id", equalTo(first))
            .body("wards[0].roles", equalTo(listOf("ward_admin")))

        // Removed from their last ward, they are an account with no ward.
        asAdmin().contentType(ContentType.JSON)
            .body("""{"removeFromWard": true, "wardId": $first}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("wards", hasSize<Any>(0))
            .body("roles", equalTo(listOf("user")))
    }

    @Test
    fun `approving a join request adds a ward without replacing the user's others`() {
        val existing = createWard("Existing")
        val requested = createWard("Requested")
        val (userId, email) = createUser()
        setRoles(userId, existing, """["ward_admin"]""")

        val requestId = asUser(email).contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": $requested}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/")
        asAdmin().contentType(ContentType.JSON).body("""{"approve": true}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(200)

        asAdmin()
            .`when`().get("/users/$userId")
            .then().statusCode(200)
            .body("wards.find { it.id == $existing }.roles", equalTo(listOf("ward_admin")))
            .body("wards.find { it.id == $requested }.roles", equalTo(listOf("user")))
    }

    @Test
    fun `a ward admin only sees and resolves join requests for wards they run`() {
        val mine = createWard("Mine")
        val theirs = createWard("Theirs")
        val (adminId, adminEmail) = createUser()
        setRoles(adminId, mine, """["ward_admin"]""")
        setRoles(adminId, theirs, """["user"]""")
        val (applicantId, applicantEmail) = createUser()

        fun request(wardId: Int): String =
            asUser(applicantEmail).contentType(ContentType.JSON)
                .body("""{"userId": $applicantId, "wardId": $wardId}""")
                .`when`().post("/join-requests")
                .then().statusCode(201)
                .extract().header("Location").substringAfterLast("/")
        val toMine = request(mine).toInt()
        val toTheirs = request(theirs).toInt()

        asUser(adminEmail)
            .`when`().get("/join-requests")
            .then().statusCode(200)
            .body("id", hasItem(toMine))
            .body("id", not(hasItem(toTheirs)))
        asUser(adminEmail).contentType(ContentType.JSON).body("""{"approve": true}""")
            .`when`().put("/join-requests/$toTheirs").then().statusCode(403)
        asUser(adminEmail).contentType(ContentType.JSON).body("""{"approve": true}""")
            .`when`().put("/join-requests/$toMine").then().statusCode(200)
    }

    @Test
    fun `a member link is per ward, and leading a district counts only in that ward`() {
        val led = createWard("Led")
        val other = createWard("Other")
        val (userId, email) = createUser()
        setRoles(userId, led, """["user"]""")
        setRoles(userId, other, """["user"]""")
        val leader = createMember(led, "Leader")
        val neighbour = createMember(led, "Neighbour")
        val elsewhere = createMember(other, "Elsewhere")
        val districtId = asAdmin().contentType(ContentType.JSON)
            .body("""{"name": "Led District", "color": "Red", "leaderId": $leader, "memberIds": [$leader, $neighbour]}""")
            .`when`().post("/wards/$led/districts")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()
        asAdmin().contentType(ContentType.JSON)
            .body("""{"name": "Other District", "color": "Green", "memberIds": [$elsewhere]}""")
            .`when`().post("/wards/$other/districts").then().statusCode(201)

        // Linked in both wards at once.
        asAdmin().contentType(ContentType.JSON).body("""{"memberId": $leader}""")
            .`when`().put("/users/$userId").then().statusCode(200)
        asAdmin().contentType(ContentType.JSON).body("""{"memberId": $elsewhere}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("wards.find { it.id == $led }.memberId", equalTo(leader))
            .body("wards.find { it.id == $led }.roles", hasItem("district_leader"))
            .body("wards.find { it.id == $led }.leaderDistrictIds", equalTo(listOf(districtId)))
            .body("wards.find { it.id == $other }.memberId", equalTo(elsewhere))
            .body("wards.find { it.id == $other }.roles", equalTo(listOf("user")))

        val edit = """{"name": "x", "familyName": "x", "formattedAddress": "9 New Rd", "phone": "555"}"""
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$led/members/$neighbour").then().statusCode(200)
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$other/members/$elsewhere").then().statusCode(403)

        // Unlinking in one ward keeps the other ward's link.
        asAdmin().contentType(ContentType.JSON).body("""{"memberId": 0, "wardId": $led}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
            .body("wards.find { it.id == $led }.memberId", nullValue())
            .body("wards.find { it.id == $other }.memberId", equalTo(elsewhere))
    }

    @Test
    fun `approving a join request can link the account to a ward member in the same step`() {
        val wardId = createWard("Link")
        val otherWardId = createWard("LinkOther")
        val member = createMember(wardId, "Applicant")
        val outsider = createMember(otherWardId, "Outsider")
        val (userId, email) = createUser()
        val requestId = asUser(email).contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": $wardId}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/")

        // A member of some other ward is refused, and the request stays open.
        asAdmin().contentType(ContentType.JSON).body("""{"approve": true, "memberId": $outsider}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(400)
        asAdmin().`when`().get("/join-requests/$requestId").then().body("status", equalTo("PENDING"))

        asAdmin().contentType(ContentType.JSON).body("""{"approve": true, "memberId": $member}""")
            .`when`().put("/join-requests/$requestId")
            .then().statusCode(200)
        asAdmin()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("find { it.id == $userId }.memberId", equalTo(member))

        // Adding an existing account to a ward can link it the same way.
        val (secondId, _) = createUser()
        val secondMember = createMember(wardId, "Second")
        asAdmin().contentType(ContentType.JSON).body("""{"wardId": $wardId, "memberId": $secondMember}""")
            .`when`().put("/users/$secondId")
            .then().statusCode(200)
            .body("wards.find { it.id == $wardId }.memberId", equalTo(secondMember))
            .body("wards.find { it.id == $wardId }.roles", equalTo(listOf("user")))
    }

    @Test
    fun `a system admin is offered every ward`() {
        val wardId = createWard("Any")

        asAdmin()
            .`when`().get("/auth/me")
            .then().statusCode(200)
            .body("wards.find { it.id == $wardId }.roles", equalTo(listOf("admin")))
    }
}
