package dd.resource

import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import io.restassured.response.ValidatableResponse
import io.restassured.specification.RequestSpecification
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.not
import org.hamcrest.Matchers.notNullValue
import org.hamcrest.Matchers.nullValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * A role-by-role review of what each kind of user can reach.
 *
 * The cast, all built once in [Fixture]:
 *  - anonymous   no token
 *  - outsider    an account that belongs to no ward
 *  - plain       an account attached to ward A with no role beyond that:
 *                not its admin and not a district leader, so no access
 *  - leader      a member of ward A whose login is linked to the leader of
 *                district A1 (so: the derived district_leader role)
 *  - adminA      ward admin of ward A
 *  - adminB      ward admin of ward B - an admin, but of the wrong ward
 *  - system      the system admin
 *
 * Each test states, per actor, the status an endpoint must answer with.
 */
@QuarkusTest
class PermissionsTest {

    private class Fixture {
        val stamp = System.nanoTime()
        val wardA = ward("Perm A $stamp", """, "lat": 40.0, "lng": -111.0""")
        val wardB = ward("Perm B $stamp", """, "lat": 41.0, "lng": -112.0""")

        val leaderA = member(wardA, "Leader")
        val memberA1 = member(wardA, "In A1")
        val memberA2 = member(wardA, "In A2")
        val memberB1 = member(wardB, "In B1")

        val districtA1 = district(wardA, "A1", leaderA, listOf(leaderA, memberA1))
        val districtA2 = district(wardA, "A2", 0, listOf(memberA2))
        val districtB1 = district(wardB, "B1", 0, listOf(memberB1))

        val outsider = user()
        val plain = user().also { join(it, wardA, "user") }
        val leader = user().also {
            join(it, wardA, "user")
            asAdmin().contentType(ContentType.JSON).body("""{"memberId": $leaderA}""")
                .`when`().put("/users/${it.first}").then().statusCode(200)
        }
        val adminA = user().also { join(it, wardA, "ward_admin") }
        val adminB = user().also { join(it, wardB, "ward_admin") }

        private fun ward(name: String, extra: String): Int =
            asAdmin().contentType(ContentType.JSON).body("""{"name": "$name"$extra}""")
                .`when`().post("/wards").then().statusCode(201)
                .extract().header("Location").substringAfterLast("/").toInt()

        fun member(wardId: Int, name: String): Int =
            asAdmin().contentType(ContentType.JSON)
                .body("""{"name": "$name ${System.nanoTime()}", "familyName": "Perm", "formattedAddress": "1 Test St", "address1": "1 Test St"}""")
                .`when`().post("/wards/$wardId/members").then().statusCode(201)
                .extract().header("Location").substringAfterLast("/").toInt()

        fun district(wardId: Int, name: String, leaderId: Int, memberIds: List<Int>): Int =
            asAdmin().contentType(ContentType.JSON)
                .body("""{"name": "$name ${System.nanoTime()}", "color": "Red", "leaderId": $leaderId, "memberIds": $memberIds}""")
                .`when`().post("/wards/$wardId/districts").then().statusCode(201)
                .extract().header("Location").substringAfterLast("/").toInt()

        /** Creates an account; returns (id, email). */
        fun user(): Pair<Int, String> {
            val email = "perm-${System.nanoTime()}@example.com"
            val id = given().contentType(ContentType.JSON)
                .body("""{"email": "$email", "password": "password123"}""")
                .`when`().post("/users").then().statusCode(201)
                .extract().header("Location").substringAfterLast("/").toInt()
            return id to email
        }

        private fun join(user: Pair<Int, String>, wardId: Int, role: String) {
            asAdmin().contentType(ContentType.JSON).body("""{"roles": ["$role"], "wardId": $wardId}""")
                .`when`().put("/users/${user.first}").then().statusCode(200)
        }
    }

    private companion object {
        // Built on first use, inside a running test, and shared by every test.
        val fx: Fixture by lazy { Fixture() }

        const val MEMBER = """{"name": "New", "familyName": "Perm", "formattedAddress": "2 Test St", "address1": "2 Test St"}"""
    }

    // --- actors ---------------------------------------------------------

    private fun anonymous(): RequestSpecification = given()
    private fun outsider() = asUser(fx.outsider.second)
    private fun plain() = asUser(fx.plain.second)
    private fun leader() = asUser(fx.leader.second)
    private fun adminA() = asUser(fx.adminA.second)
    private fun adminB() = asUser(fx.adminB.second)
    private fun system() = asAdmin()

    private fun RequestSpecification.send(method: String, path: String, body: String? = null): ValidatableResponse {
        val request = if (body != null) contentType(ContentType.JSON).body(body) else this
        return request.`when`().request(method, path).then()
    }

    /** Asserts the status each named actor gets for one request. */
    private fun check(method: String, path: String, body: String?, vararg expected: Pair<String, Int>) {
        val actors = mapOf<String, () -> RequestSpecification>(
            "anonymous" to ::anonymous, "outsider" to ::outsider, "plain" to ::plain, "leader" to ::leader,
            "adminA" to ::adminA, "adminB" to ::adminB, "system" to ::system,
        )
        for ((actor, status) in expected) {
            val actual = actors.getValue(actor)().send(method, path, body).extract().statusCode()
            assertEquals(status, actual, "$actor $method $path")
        }
    }

    // --- reading a ward -------------------------------------------------

    @Test
    fun `reading a ward takes at least a district leader - an attached account sees nothing`() {
        val a = fx.wardA
        for (path in listOf(
            "/wards/$a", "/wards/$a/members", "/wards/$a/members/${fx.memberA1}",
            "/wards/$a/districts", "/wards/$a/districts/${fx.districtA1}",
        )) {
            check(
                "GET", path, null,
                "anonymous" to 401, "outsider" to 403, "plain" to 403, "adminB" to 403,
                "leader" to 200, "adminA" to 200, "system" to 200,
            )
        }
        // The ward-wide location check is an admin's tool.
        check(
            "GET", "/wards/$a/members/outliers", null,
            "anonymous" to 401, "plain" to 403, "leader" to 403, "adminB" to 403, "adminA" to 200, "system" to 200,
        )
    }

    @Test
    fun `a district leader sees only their own district and its members`() {
        val a = fx.wardA

        // The lists hold just their district and the people in it...
        leader().`when`().get("/wards/$a/districts").then().statusCode(200)
            .body("id", equalTo(listOf(fx.districtA1)))
        leader().`when`().get("/wards/$a/members").then().statusCode(200)
            .body("id.sort()", equalTo(listOf(fx.leaderA, fx.memberA1).sorted()))
        // ...where the ward's admin sees everything.
        adminA().`when`().get("/wards/$a/districts").then().statusCode(200)
            .body("id", hasItem(fx.districtA2))
        adminA().`when`().get("/wards/$a/members").then().statusCode(200)
            .body("id", hasItem(fx.memberA2))

        // Asking for the rest by id finds nothing.
        check("GET", "/wards/$a/members/${fx.memberA2}", null, "leader" to 404, "adminA" to 200)
        check("GET", "/wards/$a/districts/${fx.districtA2}", null, "leader" to 404, "adminA" to 200)

        // They can still see who leads the ward, to know who to call.
        system().send("PUT", "/wards/$a", """{"leaderId": ${fx.memberA2}}""").statusCode(200)
        leader().`when`().get("/wards/$a").then().statusCode(200)
            .body("leaderName", notNullValue())
        system().send("PUT", "/wards/$a", """{"leaderId": 0}""").statusCode(200)
    }

    @Test
    fun `the ward list gives outsiders names only`() {
        // Anyone signed in can see which wards exist (to ask to join one)...
        check("GET", "/wards", null, "anonymous" to 401, "outsider" to 200, "plain" to 200)

        // ...but a ward's map center and leader are for people with access to
        // it: not for an account that is merely attached.
        leader().`when`().get("/wards").then().statusCode(200)
            .body("find { it.id == ${fx.wardA} }.lat", equalTo(40.0f))
            .body("find { it.id == ${fx.wardB} }.name", notNullValue())
            .body("find { it.id == ${fx.wardB} }.lat", nullValue())
        plain().`when`().get("/wards").then().statusCode(200)
            .body("find { it.id == ${fx.wardA} }.name", notNullValue())
            .body("find { it.id == ${fx.wardA} }.lat", nullValue())
        outsider().`when`().get("/wards").then().statusCode(200)
            .body("find { it.id == ${fx.wardA} }.lat", nullValue())
        system().`when`().get("/wards").then().statusCode(200)
            .body("find { it.id == ${fx.wardB} }.lat", equalTo(41.0f))
    }

    // --- managing a ward ------------------------------------------------

    @Test
    fun `only the ward's own admin (and the system admin) can change members`() {
        val a = fx.wardA
        val denied = arrayOf("anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminB" to 403)

        check("POST", "/wards/$a/members", MEMBER, *denied)
        check("POST", "/wards/$a/members/bulk", "[$MEMBER]", *denied)
        check("POST", "/wards/$a/members/geocode", """{"memberIds": [${fx.memberA1}]}""", *denied)
        check("DELETE", "/wards/$a/members/${fx.memberA2}", null, *denied)

        for (admin in listOf("adminA", "system")) {
            val body = MEMBER.replace("New", "New $admin ${System.nanoTime()}")
            check("POST", "/wards/$a/members", body, admin to 201)
            check("POST", "/wards/$a/members/bulk", "[${body.replace("New", "Bulk")}]", admin to 207)
            check("DELETE", "/wards/$a/members/${fx.member(a, "Disposable")}", null, admin to 204)
        }
    }

    @Test
    fun `only the ward's own admin (and the system admin) can change districts`() {
        val a = fx.wardA
        val denied = arrayOf("anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminB" to 403)
        val district = """{"name": "Nope ${System.nanoTime()}", "color": "Green"}"""

        check("POST", "/wards/$a/districts", district, *denied)
        // Including the district's own leader: they can't rename it, change
        // who is in it, or replace the leader or assistant.
        check("PUT", "/wards/$a/districts/${fx.districtA1}", """{"name": "Renamed"}""", *denied)
        check("PUT", "/wards/$a/districts/${fx.districtA1}", """{"memberIds": [${fx.leaderA}]}""", *denied)
        check("PUT", "/wards/$a/districts/${fx.districtA1}", """{"leaderId": 0, "assistantId": ${fx.memberA1}}""", *denied)
        check("DELETE", "/wards/$a/districts/${fx.districtA2}", null, *denied)

        for (admin in listOf("adminA", "system")) {
            check("POST", "/wards/$a/districts", """{"name": "Made by $admin ${System.nanoTime()}", "color": "Green"}""", admin to 201)
            val disposable = fx.district(a, "Disposable", 0, emptyList())
            check("PUT", "/wards/$a/districts/$disposable", """{"color": "Pink"}""", admin to 200)
            check("DELETE", "/wards/$a/districts/$disposable", null, admin to 204)
        }
    }

    @Test
    fun `only the ward's own admin (and the system admin) can change the ward, its users or its data file`() {
        val a = fx.wardA
        val denied = arrayOf("anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminB" to 403)
        val importFile = """{"format": "disaster-districts-ward", "version": 1}"""

        check("PUT", "/wards/$a", """{"lat": 40.0, "lng": -111.0}""", *denied)
        check("GET", "/wards/$a/users", null, *denied)
        check("GET", "/wards/$a/export", null, *denied)
        check("POST", "/wards/$a/import", importFile, *denied)

        for (admin in listOf("adminA", "system")) {
            check("PUT", "/wards/$a", """{"lat": 40.0, "lng": -111.0}""", admin to 200)
            check("GET", "/wards/$a/users", null, admin to 200)
            check("GET", "/wards/$a/export", null, admin to 200)
            check("POST", "/wards/$a/import", importFile, admin to 200)
        }
    }

    @Test
    fun `creating and deleting wards is for the system admin alone`() {
        val ward = """{"name": "Perm Disposable ${System.nanoTime()}"}"""
        val denied = arrayOf("anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminA" to 403)

        check("POST", "/wards", ward, *denied)
        check("DELETE", "/wards/${fx.wardA}", null, *denied)

        val created = system().send("POST", "/wards", ward).statusCode(201)
            .extract().header("Location").substringAfterLast("/")
        check("DELETE", "/wards/$created", null, "system" to 204)
    }

    // --- the district leader --------------------------------------------

    @Test
    fun `a district leader edits contact details in their own district and nothing else`() {
        val a = fx.wardA
        val edit = """{"name": "Hijacked", "familyName": "Hijacked", "formattedAddress": "9 New Rd", "address1": "9 New Rd", "phone": "555-0100", "notes": "updated"}"""

        // In their district: allowed for the leader, refused for a plain
        // member and for another ward's admin.
        check(
            "PUT", "/wards/$a/members/${fx.memberA1}", edit,
            "anonymous" to 401, "outsider" to 403, "plain" to 403, "adminB" to 403, "leader" to 200,
        )
        // The contact fields were saved; the name the leader also sent was not.
        system().`when`().get("/wards/$a/members/${fx.memberA1}").then().statusCode(200)
            .body("phone", equalTo("555-0100"))
            .body("notes", equalTo("updated"))
            .body("familyName", equalTo("Perm"))

        // A member of another district in the same ward.
        check("PUT", "/wards/$a/members/${fx.memberA2}", edit, "leader" to 403)
    }

    // --- one ward's admin reaching into another ward --------------------

    @Test
    fun `a ward admin cannot read or change another ward's members or districts by id`() {
        val a = fx.wardA
        // Their own ward in the URL, the other ward's ids in the path: it must
        // look as though those don't exist.
        check("GET", "/wards/$a/members/${fx.memberB1}", null, "adminA" to 404, "leader" to 404)
        check("PUT", "/wards/$a/members/${fx.memberB1}", MEMBER, "adminA" to 404)
        check("DELETE", "/wards/$a/members/${fx.memberB1}", null, "adminA" to 404)
        check("GET", "/wards/$a/districts/${fx.districtB1}", null, "adminA" to 404, "leader" to 404)
        check("PUT", "/wards/$a/districts/${fx.districtB1}", """{"name": "Taken over"}""", "adminA" to 404)
        check("DELETE", "/wards/$a/districts/${fx.districtB1}", null, "adminA" to 404)

        // Nor pull the other ward's member into one of their own districts,
        // as a member or as its leader.
        adminA().send("PUT", "/wards/$a/districts/${fx.districtA2}", """{"memberIds": [${fx.memberA2}, ${fx.memberB1}]}""")
            .statusCode(200)
        check("PUT", "/wards/$a/districts/${fx.districtA2}", """{"leaderId": ${fx.memberB1}}""", "adminA" to 400)
        check(
            "POST", "/wards/$a/districts",
            """{"name": "Poacher ${System.nanoTime()}", "color": "Red", "leaderId": ${fx.memberB1}}""",
            "adminA" to 400,
        )

        // Ward B's member and district are exactly as they were.
        system().`when`().get("/wards/${fx.wardB}/members/${fx.memberB1}").then().statusCode(200)
            .body("familyName", equalTo("Perm"))
            .body("district.id", equalTo(fx.districtB1))
        system().`when`().get("/wards/${fx.wardB}/districts/${fx.districtB1}").then().statusCode(200)
            .body("leaderId", nullValue())
    }

    // --- accounts and roles ---------------------------------------------

    @Test
    fun `the account list is for admins, and a ward admin only sees their own ward's standing`() {
        check(
            "GET", "/users", null,
            "anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminA" to 200, "system" to 200,
        )
        check("GET", "/users/${fx.adminB.first}", null, "plain" to 403, "leader" to 403, "adminA" to 200)

        // adminA learns that adminB's account exists, but not that they run
        // ward B; and system admins aren't listed at all.
        adminA().`when`().get("/users").then().statusCode(200)
            .body("email", not(hasItem("admin@example.com")))
            .body("find { it.id == ${fx.adminB.first} }.email", equalTo(fx.adminB.second))
            .body("find { it.id == ${fx.adminB.first} }.wards", hasSize<Any>(0))
            .body("find { it.id == ${fx.adminB.first} }.roles", hasSize<Any>(0))
            .body("find { it.id == ${fx.plain.first} }.wards.id", equalTo(listOf(fx.wardA)))
        system().`when`().get("/users").then().statusCode(200)
            .body("email", hasItem("admin@example.com"))
            .body("find { it.id == ${fx.adminB.first} }.wards.id", equalTo(listOf(fx.wardB)))
    }

    @Test
    fun `changing someone's access is limited to wards the caller administers`() {
        val a = fx.wardA
        val b = fx.wardB
        val target = fx.user().first
        val denied = arrayOf("anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403)

        // Adding to, setting a role in, or removing from ward A.
        check("PUT", "/users/$target", """{"wardId": $a}""", *denied, "adminB" to 403)
        check("PUT", "/users/$target", """{"wardId": $a}""", "adminA" to 200)
        check("PUT", "/users/$target", """{"roles": ["ward_admin"], "wardId": $a}""", *denied, "adminB" to 403)
        check("PUT", "/users/$target", """{"removeFromWard": true, "wardId": $a}""", *denied, "adminB" to 403)

        // adminA can't act on ward B, even for someone who is also in ward A.
        check("PUT", "/users/$target", """{"wardId": $b}""", "adminA" to 403)
        check("PUT", "/users/${fx.adminB.first}", """{"roles": ["user"], "wardId": $b}""", "adminA" to 403)

        // Nor link an account to another ward's member.
        check("PUT", "/users/$target", """{"memberId": ${fx.memberB1}}""", "adminA" to 400)
    }

    @Test
    fun `a ward admin can link an account to one of their ward's members, and unlink it`() {
        val a = fx.wardA
        val account = fx.user()
        val member = fx.member(a, "Linkable")
        val link = """{"wardId": $a, "memberId": $member}"""

        // Only that ward's admin (or the system admin) can make the link.
        check("PUT", "/users/${account.first}", link, "anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403, "adminB" to 403)

        // One request both attaches the account to the ward and links it.
        adminA().send("PUT", "/users/${account.first}", link).statusCode(200)
            .body("wards.find { it.id == $a }.memberId", equalTo(member))
        adminA().`when`().get("/wards/$a/users").then().statusCode(200)
            .body("find { it.id == ${account.first} }.memberId", equalTo(member))

        // Making that member a district's assistant is what gives the account
        // access - and it shows as a district leader straight away.
        val district = fx.district(a, "Linked", 0, listOf(member))
        adminA().send("PUT", "/wards/$a/districts/$district", """{"assistantId": $member}""").statusCode(200)
        asUser(account.second).`when`().get("/wards/$a/members").then().statusCode(200)
            .body("id", equalTo(listOf(member)))

        // Unlinking takes the access away again.
        adminA().send("PUT", "/users/${account.first}", """{"wardId": $a, "memberId": 0}""").statusCode(200)
            .body("wards.find { it.id == $a }.memberId", nullValue())
        asUser(account.second).`when`().get("/wards/$a/members").then().statusCode(403)
    }

    @Test
    fun `system admin can only be granted by a system admin, and survives ward role changes`() {
        val a = fx.wardA
        val target = fx.user().first
        system().send("PUT", "/users/$target", """{"wardId": $a}""").statusCode(200)

        // A ward admin can't hand it out, with or without naming their ward.
        check("PUT", "/users/$target", """{"roles": ["admin"], "wardId": $a}""", "adminA" to 403)
        check("PUT", "/users/$target", """{"roles": ["admin"]}""", "adminA" to 403)

        // A ward-scoped role change by a system admin doesn't grant it either...
        system().send("PUT", "/users/$target", """{"roles": ["admin", "user"], "wardId": $a}""").statusCode(200)
            .body("roles", not(hasItem("admin")))

        // ...and once someone is a system admin, no ward admin can touch them,
        // and setting their role in a ward leaves the system role in place.
        system().send("PUT", "/users/$target", """{"roles": ["admin"]}""").statusCode(200)
            .body("roles", hasItem("admin"))
        check("PUT", "/users/$target", """{"roles": ["user"], "wardId": $a}""", "adminA" to 403)
        check("PUT", "/users/$target", """{"removeFromWard": true, "wardId": $a}""", "adminA" to 403)
        system().send("PUT", "/users/$target", """{"roles": ["user"], "wardId": $a}""").statusCode(200)
            .body("roles", hasItem("admin"))
    }

    @Test
    fun `a system admin can also be made a ward's admin, and keeps the system role`() {
        val a = fx.wardA
        val second = fx.user()
        system().send("PUT", "/users/${second.first}", """{"roles": ["admin"]}""").statusCode(200)

        system().send("PUT", "/users/${second.first}", """{"roles": ["ward_admin"], "wardId": $a}""").statusCode(200)
            .body("roles", hasItem("admin"))
            .body("wards.find { it.id == $a }.roles", equalTo(listOf("admin", "ward_admin")))
        // They now show up among the ward's own users, as its ward admin.
        system().`when`().get("/wards/$a/users").then().statusCode(200)
            .body("find { it.id == ${second.first} }.roles", equalTo(listOf("ward_admin")))

        // They can be linked to a member there too, and so be a district's
        // leader or assistant like anyone else.
        val member = fx.member(a, "Admin As Leader")
        val district = fx.district(a, "Led By Admin", member, listOf(member))
        system().send("PUT", "/users/${second.first}", """{"wardId": $a, "memberId": $member}""").statusCode(200)
            .body("wards.find { it.id == $a }.memberId", equalTo(member))
            .body("wards.find { it.id == $a }.roles", hasItem("district_leader"))
            .body("wards.find { it.id == $a }.leaderDistrictIds", equalTo(listOf(district)))

        // Taking the ward role away again leaves the system role alone.
        system().send("PUT", "/users/${second.first}", """{"removeFromWard": true, "wardId": $a}""").statusCode(200)
            .body("roles", equalTo(listOf("admin")))
        system().send("PUT", "/users/${second.first}", """{"roles": ["user"]}""").statusCode(200)
    }

    @Test
    fun `the last system admin cannot be demoted`() {
        val onlyAdmin = system().`when`().get("/users").then().statusCode(200)
            .extract().jsonPath().getInt("find { it.email == 'admin@example.com' }.id")
        // Clear out any other system admins earlier tests may have made.
        val others: List<Int> = system().`when`().get("/users").then().statusCode(200)
            .extract().jsonPath().getList("findAll { it.roles.contains('admin') && it.id != $onlyAdmin }.id")
        for (id in others) system().send("PUT", "/users/$id", """{"roles": ["user"]}""").statusCode(200)

        system().send("PUT", "/users/$onlyAdmin", """{"roles": ["user"]}""").statusCode(409)
            .body("error", notNullValue())
        system().`when`().get("/auth/me").then().statusCode(200).body("roles", hasItem("admin"))

        // With a second system admin in place, the first can step down - and
        // is then put back so the rest of the suite still has its admin.
        val second = fx.user()
        system().send("PUT", "/users/${second.first}", """{"roles": ["admin"]}""").statusCode(200)
        asUser(second.second).send("PUT", "/users/$onlyAdmin", """{"roles": ["user"]}""").statusCode(200)
        asUser(second.second).send("PUT", "/users/$onlyAdmin", """{"roles": ["admin"]}""").statusCode(200)
        system().send("PUT", "/users/${second.first}", """{"roles": ["user"]}""").statusCode(200)
    }

    // --- requests to join a ward ----------------------------------------

    @Test
    fun `join requests can be made for yourself and resolved only by that ward's admin`() {
        val a = fx.wardA
        val applicant = fx.user()
        val forApplicant = """{"userId": ${applicant.first}, "wardId": $a}"""

        // Nobody else can file a request in the applicant's name.
        check("POST", "/join-requests", forApplicant, "anonymous" to 401, "outsider" to 403, "plain" to 403, "adminA" to 403)
        val requestId = asUser(applicant.second).send("POST", "/join-requests", forApplicant).statusCode(201)
            .extract().header("Location").substringAfterLast("/")

        // The applicant can follow their own request; other members can't.
        asUser(applicant.second).`when`().get("/join-requests?userId=${applicant.first}").then().statusCode(200)
        check("GET", "/join-requests?userId=${applicant.first}", null, "anonymous" to 401, "plain" to 403, "leader" to 403)
        check("GET", "/join-requests/$requestId", null, "plain" to 403, "adminB" to 403, "adminA" to 200, "system" to 200)

        // The pending queue is for admins, each seeing only their own wards.
        check("GET", "/join-requests", null, "anonymous" to 401, "outsider" to 403, "plain" to 403, "leader" to 403)
        adminA().`when`().get("/join-requests").then().statusCode(200).body("id", hasItem(requestId.toInt()))
        adminB().`when`().get("/join-requests").then().statusCode(200).body("id", not(hasItem(requestId.toInt())))

        // Resolving it: the applicant can't approve themselves, the other
        // ward's admin can't either, and nobody below system admin can use
        // approval to hand out system-admin.
        val approve = """{"approve": true}"""
        check("PUT", "/join-requests/$requestId", approve, "anonymous" to 401, "plain" to 403, "leader" to 403, "adminB" to 403)
        assertEquals(403, asUser(applicant.second).send("PUT", "/join-requests/$requestId", approve).extract().statusCode())
        check("PUT", "/join-requests/$requestId", """{"approve": true, "assignedRole": "admin"}""", "adminA" to 403)
        check("PUT", "/join-requests/$requestId", approve, "adminA" to 200)
    }

    // --- the session endpoint -------------------------------------------

    @Test
    fun `the session endpoint describes only the caller`() {
        check("GET", "/auth/me", null, "anonymous" to 401, "outsider" to 200)

        plain().`when`().get("/auth/me").then().statusCode(200)
            .body("email", equalTo(fx.plain.second))
            .body("wards.id", equalTo(listOf(fx.wardA)))
            .body("wards[0].roles", equalTo(listOf("user")))
        leader().`when`().get("/auth/me").then().statusCode(200)
            .body("wards[0].roles", hasItem("district_leader"))
            .body("wards[0].leaderDistrictIds", equalTo(listOf(fx.districtA1)))
        outsider().`when`().get("/auth/me").then().statusCode(200)
            .body("wards", hasSize<Any>(0))
    }
}
