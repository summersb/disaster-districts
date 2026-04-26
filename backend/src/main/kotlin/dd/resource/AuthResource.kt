package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dd.dao.UserAccountDao
import dd.dao.UserRoleDao
import dd.repository.UserAccountRepository
import io.smallrye.jwt.build.Jwt
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Instant
import java.time.temporal.ChronoUnit

@Path("/auth")
class AuthResource(
    val userAccountRepository: UserAccountRepository,
) {

    private fun verifyPassword(password: String, storedHash: String): Boolean {
        return BCrypt.verifyer().verify(password.toCharArray(), storedHash).verified
    }

    private fun generateToken(email: String): String {
        return Jwt.issuer("menu-api")
            .subject(email)
            .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
            .claim("edit", true)
            .sign()
    }

    private fun verifyGoogleToken(credential: String): String? {
        val client = HttpClient.newHttpClient()
        val req = HttpRequest.newBuilder()
            .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=$credential"))
            .GET()
            .build()
        val resp = client.send(req, HttpResponse.BodyHandlers.ofString())
        if (resp.statusCode() != 200) return null
        val tokenInfo = jacksonObjectMapper().readValue<Map<String, String>>(resp.body())
        if (tokenInfo["email_verified"] != "true") return null
        return tokenInfo["email"]
    }

    @GET
    @Path("/setup")
    @Produces(MediaType.APPLICATION_JSON)
    fun checkSetup(): Response {
        val needsSetup = userAccountRepository.count() == 0L
        return Response.ok(SetupStatus(needsSetup)).build()
    }

    @POST
    @Path("/setup")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    fun setupAdmin(request: SetupRequest): Response {
        if (userAccountRepository.count() > 0) {
            return Response.status(Response.Status.FORBIDDEN).build()
        }

        val email: String
        val passwordHash: String?

        if (request.credential != null) {
            email = verifyGoogleToken(request.credential)
                ?: return Response.status(Response.Status.UNAUTHORIZED).build()
            passwordHash = null
        } else if (request.email != null && request.password != null) {
            email = request.email
            passwordHash = BCrypt.withDefaults().hashToString(12, request.password.toCharArray())
        } else {
            return Response.status(Response.Status.BAD_REQUEST).build()
        }

        val admin = UserAccountDao().apply {
            this.email = email
            this.passwordHash = passwordHash
        }
        admin.persist()
        val adminRole = UserRoleDao().apply {
            this.user = admin
            this.role = "admin"
        }
        admin.userRoles.add(adminRole)

        val token = generateToken(admin.email)
        return Response.ok(AuthResponse(token, admin.id, admin.email, admin.getRoleList(), admin.getWard()?.id)).build()
    }

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    fun login(user: User): Response {
        val foundUser = userAccountRepository.findByEmail(user.email)
            ?: return Response.status(Response.Status.UNAUTHORIZED).build()

        val storedHash = foundUser.passwordHash
            ?: return Response.status(Response.Status.UNAUTHORIZED).build()

        if (user.password == null || !verifyPassword(user.password, storedHash)) {
            return Response.status(Response.Status.UNAUTHORIZED).build()
        }

        val token = generateToken(foundUser.email)
        return Response.ok(AuthResponse(token, foundUser.id, foundUser.email, foundUser.getRoleList(), foundUser.getWard()?.id)).build()
    }

    @POST
    @Path("/google")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    fun googleLogin(request: GoogleTokenRequest): Response {
        val email = verifyGoogleToken(request.credential)
            ?: return Response.status(Response.Status.UNAUTHORIZED).build()

        val user = userAccountRepository.findByEmail(email) ?: run {
            val newUser = UserAccountDao().apply { this.email = email }
            newUser.persist()
            val defaultRole = UserRoleDao().apply {
                this.user = newUser
                this.role = "user"
            }
            newUser.userRoles.add(defaultRole)
            newUser
        }

        val token = generateToken(user.email)
        return Response.ok(AuthResponse(token, user.id, user.email, user.getRoleList(), user.getWard()?.id)).build()
    }
}

data class SetupStatus(val needsSetup: Boolean)

data class SetupRequest(
    val email: String? = null,
    val password: String? = null,
    val credential: String? = null,
)

data class AuthResponse(
    val token: String,
    val id: Long?,
    val email: String,
    val roles: List<String>,
    val wardId: Long?,
)

data class GoogleTokenRequest(
    val credential: String,
)
