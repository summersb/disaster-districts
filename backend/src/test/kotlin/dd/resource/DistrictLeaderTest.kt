package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Test

// The district_leader role: derived from a login's linked member being the
// leader or assistant of a district, and worth exactly one thing - editing the
// contact details of members in that district.
@QuarkusTest
class DistrictLeaderTest {

    private fun createWard(): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "Leader Role Ward ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createMember(wardId: Int, name: String): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body(
                """{"name": "$name", "familyName": "Role", "formattedAddress": "1 Old St", "address1": "1 Old St",
                    "phone": "111", "lat": 33.0, "lng": -117.0}""",
            )
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    private fun createDistrict(wardId: Int, name: String, leaderId: Int, assistantId: Int, memberIds: List<Int>): Int =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name", "color": "Red", "leaderId": $leaderId, "assistantId": $assistantId, "memberIds": $memberIds}""")
            .`when`().post("/wards/$wardId/districts")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

    /** A plain user in [wardId]; returns (user id, email). */
    private fun createWardUser(wardId: Int): Pair<Int, String> {
        val email = "leader-${System.nanoTime()}@example.com"
        val userId = asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"roles": ["user"], "wardId": $wardId}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
        return userId to email
    }

    private fun linkMember(userId: Int, memberId: Int) =
        asAdmin()
            .contentType(ContentType.JSON)
            .body("""{"memberId": $memberId}""")
            .`when`().put("/users/$userId")

    private val edit =
        """{"name": "Renamed", "familyName": "Changed", "formattedAddress": "9 New Rd, Vista", "address1": "9 New Rd",
            "city": "Vista", "phone": "760-555-9999", "notes": "has a dog", "lat": 1.0, "lng": 2.0}"""

    @Test
    fun `a district leader can update contact details of members in their district only`() {
        val wardId = createWard()
        val leader = createMember(wardId, "Leader")
        val assistant = createMember(wardId, "Assistant")
        val inDistrict = createMember(wardId, "In District")
        val elsewhere = createMember(wardId, "Elsewhere")
        val districtId = createDistrict(wardId, "Led", leader, assistant, listOf(leader, assistant, inDistrict))
        val (userId, email) = createWardUser(wardId)

        // Not linked to a member yet: an ordinary user, who can't edit anyone.
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$wardId/members/$inDistrict")
            .then().statusCode(403)

        linkMember(userId, leader).then().statusCode(200)
            .body("memberId", equalTo(leader))
            .body("roles", hasItem("district_leader"))
            .body("leaderDistrictIds", equalTo(listOf(districtId)))

        // Address, phone and notes are saved; the name and coordinates the
        // request also tried to change are not.
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$wardId/members/$inDistrict")
            .then().statusCode(200)
        asAdmin()
            .`when`().get("/wards/$wardId/members/$inDistrict")
            .then().statusCode(200)
            .body("address1", equalTo("9 New Rd"))
            .body("city", equalTo("Vista"))
            .body("formattedAddress", equalTo("9 New Rd, Vista"))
            .body("phone", equalTo("760-555-9999"))
            .body("notes", equalTo("has a dog"))
            .body("name", equalTo("In District"))
            .body("familyName", equalTo("Role"))
            .body("lat", equalTo(33.0f))
            .body("district.id", equalTo(districtId))

        // A member outside their district is off limits.
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$wardId/members/$elsewhere")
            .then().statusCode(403)

        // So is everything else a ward admin can do: the roster, the leader
        // and assistant, adding and deleting members.
        asUser(email).contentType(ContentType.JSON)
            .body("""{"memberIds": [$leader, $assistant, $inDistrict, $elsewhere]}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(403)
        asUser(email).contentType(ContentType.JSON).body("""{"assistantId": 0}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(403)
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(403)
        asUser(email)
            .`when`().delete("/wards/$wardId/members/$inDistrict")
            .then().statusCode(403)

        // Replacing the leader takes the role away on the very next request.
        asAdmin().contentType(ContentType.JSON).body("""{"leaderId": 0}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$wardId/members/$inDistrict")
            .then().statusCode(403)
        asAdmin()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("find { it.id == $userId }.roles", not(hasItem("district_leader")))
    }

    @Test
    fun `an assistant gets the role too, and it shows at login without being stored`() {
        val wardId = createWard()
        val leader = createMember(wardId, "Leader")
        val assistant = createMember(wardId, "Assistant")
        val districtId = createDistrict(wardId, "Assisted", leader, assistant, listOf(leader, assistant))
        val (userId, email) = createWardUser(wardId)
        linkMember(userId, assistant).then().statusCode(200)

        io.restassured.RestAssured.given()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .body("roles", hasItem("district_leader"))
            .body("memberId", equalTo(assistant))

        asUser(email).contentType(ContentType.JSON).body(edit)
            .`when`().put("/wards/$wardId/members/$leader")
            .then().statusCode(200)

        // Saving the user's roles as the UI shows them (derived role included)
        // must not turn it into a stored role that outlives the assignment.
        asAdmin().contentType(ContentType.JSON)
            .body("""{"roles": ["user", "district_leader"]}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)
        asAdmin().contentType(ContentType.JSON).body("""{"assistantId": 0}""")
            .`when`().put("/wards/$wardId/districts/$districtId")
            .then().statusCode(200)
        asAdmin()
            .`when`().get("/users/$userId")
            .then().statusCode(200)
            .body("roles", equalTo(listOf("user")))
            .body("memberId", equalTo(assistant))
    }

    @Test
    fun `a login can only be linked to a member of its own ward, and the link can be removed`() {
        val wardId = createWard()
        val otherWardId = createWard()
        val own = createMember(wardId, "Own")
        val outsider = createMember(otherWardId, "Outsider")
        val (userId, _) = createWardUser(wardId)

        linkMember(userId, outsider).then().statusCode(400)
        linkMember(userId, own).then().statusCode(200).body("memberId", equalTo(own))
        linkMember(userId, 0).then().statusCode(200).body("memberId", nullValue())

        // Deleting a linked member just drops the link.
        linkMember(userId, own).then().statusCode(200)
        asAdmin().`when`().delete("/wards/$wardId/members/$own").then().statusCode(204)
        asAdmin().`when`().get("/users/$userId").then().statusCode(200).body("memberId", nullValue())
    }
}
