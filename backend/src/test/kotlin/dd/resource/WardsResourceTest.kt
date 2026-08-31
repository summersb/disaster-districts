package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.notNullValue
import org.junit.jupiter.api.Test

@QuarkusTest
class WardsResourceTest {

    private fun sampleWardId(): Int =
        given()
            .`when`().get("/wards")
            .then().statusCode(200)
            .extract().jsonPath().getInt("find { it.name == 'Sample Ward' }.id")

    @Test
    fun `GET wards returns the seeded Sample Ward`() {
        given()
            .`when`().get("/wards")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("name", hasItem("Sample Ward"))
    }

    @Test
    fun `GET wards id returns ward dto with lat lng`() {
        val id = sampleWardId()
        given()
            .`when`().get("/wards/$id")
            .then()
            .statusCode(200)
            .body("name", equalTo("Sample Ward"))
            .body("lat", equalTo(40.7128f))
            .body("lng", equalTo(-74.006f))
    }

    @Test
    fun `GET wards id returns 404 when missing`() {
        given()
            .`when`().get("/wards/999999")
            .then()
            .statusCode(404)
    }

    @Test
    fun `GET wards wardId members returns 20 seeded members scoped to the ward`() {
        val id = sampleWardId()
        given()
            .`when`().get("/wards/$id/members")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", hasSize<Any>(20))
            .body("wardId", hasItem(id))
            .body("findAll { it.wardId != $id }", hasSize<Any>(0))
    }

    @Test
    fun `member dto includes flat district ref without recursive members list`() {
        val id = sampleWardId()
        // Anderson, James was seeded as the leader of North District.
        given()
            .`when`().get("/wards/$id/members")
            .then()
            .statusCode(200)
            .body("find { it.name == 'Anderson, James' }.district.name", equalTo("North District"))
            .body("find { it.name == 'Anderson, James' }.district.color", equalTo("Blue"))
            // The DTO must NOT carry a members back-reference (would be infinite recursion).
            .body("find { it.name == 'Anderson, James' }.district.members", equalTo(null))
    }

    @Test
    fun `GET wards wardId districts returns the two seeded districts`() {
        val id = sampleWardId()
        given()
            .`when`().get("/wards/$id/districts")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", hasSize<Any>(2))
            .body("name", hasItem("North District"))
            .body("name", hasItem("South District"))
    }

    @Test
    fun `seeded members are split between North and South districts`() {
        val id = sampleWardId()
        val members = given()
            .`when`().get("/wards/$id/members")
            .then().statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val northCount = members.count { (it["district"] as? Map<*, *>)?.get("name") == "North District" }
        val southCount = members.count { (it["district"] as? Map<*, *>)?.get("name") == "South District" }

        assert(northCount > 0) { "expected at least one member in North District" }
        assert(southCount > 0) { "expected at least one member in South District" }
        assert(northCount + southCount == 20) {
            "expected all 20 members to be assigned to a district, got north=$northCount south=$southCount"
        }
    }

    @Test
    fun `POST wards creates a ward and rejects a duplicate name`() {
        val name = "New Ward ${System.nanoTime()}"

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .header("Location", notNullValue())

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "$name"}""")
            .`when`().post("/wards")
            .then().statusCode(409)
    }

    @Test
    fun `GET wards wardId users returns only users assigned to that ward`() {
        val wardId = given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Ward Users Test ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

        val email = "ward-users-${System.nanoTime()}@example.com"
        val userId = given()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "name": "Test Person", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

        given()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("$", hasSize<Any>(0))

        given()
            .contentType(ContentType.JSON)
            .body("""{"wardId": $wardId}""")
            .`when`().put("/users/$userId")
            .then().statusCode(200)

        given()
            .`when`().get("/wards/$wardId/users")
            .then().statusCode(200)
            .body("email", hasItem(email))
            .body("find { it.email == '$email' }.name", equalTo("Test Person"))
    }

    @Test
    fun `DELETE wards id cascades districts, members, and join requests`() {
        val wardId = given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Cascade Delete Test ${System.nanoTime()}"}""")
            .`when`().post("/wards")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Cascade District"}""")
            .`when`().post("/wards/$wardId/districts")
            .then().statusCode(201)

        given()
            .contentType(ContentType.JSON)
            .body("""{"name": "Cascade Member", "familyName": "Cascade", "formattedAddress": "1 Test St"}""")
            .`when`().post("/wards/$wardId/members")
            .then().statusCode(201)

        val email = "cascade-${System.nanoTime()}@example.com"
        val userId = given()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "password123"}""")
            .`when`().post("/users")
            .then().statusCode(201)
            .extract().header("Location").substringAfterLast("/").toInt()

        given()
            .contentType(ContentType.JSON)
            .body("""{"userId": $userId, "wardId": $wardId}""")
            .`when`().post("/join-requests")
            .then().statusCode(201)

        given()
            .`when`().delete("/wards/$wardId")
            .then().statusCode(204)

        given()
            .`when`().get("/wards/$wardId")
            .then().statusCode(404)

        given()
            .`when`().get("/wards/$wardId/districts")
            .then().statusCode(200)
            .body("$", hasSize<Any>(0))

        given()
            .`when`().get("/wards/$wardId/members")
            .then().statusCode(200)
            .body("$", hasSize<Any>(0))
    }
}
