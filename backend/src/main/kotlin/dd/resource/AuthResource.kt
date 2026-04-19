package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import dd.dao.UserAccountDao
import dd.repository.UserAccountRepository
import io.smallrye.jwt.build.Jwt
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
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
        return Response.ok(AuthResponse(token, foundUser.id, foundUser.email)).build()
    }

    @POST
    @Path("/google")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @Transactional
    fun googleLogin(request: GoogleTokenRequest): Response {
        val client = HttpClient.newHttpClient()
        val req = HttpRequest.newBuilder()
            .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=${request.credential}"))
            .GET()
            .build()
        val resp = client.send(req, HttpResponse.BodyHandlers.ofString())
        if (resp.statusCode() != 200) {
            return Response.status(Response.Status.UNAUTHORIZED).build()
        }

        val tokenInfo = jacksonObjectMapper().readValue<Map<String, String>>(resp.body())
        val email = tokenInfo["email"] ?: return Response.status(Response.Status.UNAUTHORIZED).build()
        if (tokenInfo["email_verified"] != "true") {
            return Response.status(Response.Status.UNAUTHORIZED).build()
        }

        val user = userAccountRepository.findByEmail(email) ?: run {
            val newUser = UserAccountDao().apply { this.email = email }
            newUser.persist()
            newUser
        }

        val token = generateToken(user.email)
        return Response.ok(AuthResponse(token, user.id, user.email)).build()
    }
}

data class AuthResponse(
    val token: String,
    val id: Long?,
    val email: String,
)

data class GoogleTokenRequest(
    val credential: String,
)
