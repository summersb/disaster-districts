package dd.resource

import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import io.restassured.specification.RequestSpecification

// Tokens are valid for the seeded users' whole 7-day expiry, so caching them
// for the duration of a test run avoids a login round trip per call.
private val tokenCache = mutableMapOf<String, String>()

fun loginToken(email: String, password: String = "password123"): String =
    tokenCache.getOrPut(email) {
        given()
            .contentType(ContentType.JSON)
            .body("""{"email": "$email", "password": "$password"}""")
            .`when`().post("/auth/login")
            .then().statusCode(200)
            .extract().jsonPath().getString("token")
    }

/** RestAssured request pre-authenticated as the seeded system admin. */
fun asAdmin(): RequestSpecification =
    given().header("Authorization", "Bearer ${loginToken("admin@example.com")}")

/** RestAssured request pre-authenticated as an arbitrary user. */
fun asUser(email: String, password: String = "password123"): RequestSpecification =
    given().header("Authorization", "Bearer ${loginToken(email, password)}")
