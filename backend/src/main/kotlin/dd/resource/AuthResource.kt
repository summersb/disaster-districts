package dd.resource

import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.core.MediaType
import at.favre.lib.crypto.bcrypt.BCrypt
import dd.repository.UserAccountRepository
import io.smallrye.jwt.build.Jwt
import jakarta.ws.rs.core.Response
import java.time.Instant
import java.time.temporal.ChronoUnit

@Path("/auth/login")
class AuthResource (
    val userAccountRepository: UserAccountRepository,
) {

    private fun verifyPassword(password: String, storedHash: String): Boolean {
        val result = BCrypt.verifyer().verify(password.toCharArray(), storedHash)
        return result.verified
    }

    private fun generateToken(email: String): String {
        return Jwt.issuer("menu-api")  // optional
            .subject(email)
            .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
            .claim("edit", true)
            .sign()
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    fun login(user: User): Response {
        val foundUser = userAccountRepository.findByEmail(user.email)
            ?: throw Exception("invalid credentials")

        val storedHash = foundUser.passwordHash ?: throw Exception("No password set for user")

        if (user.password == null || !verifyPassword(user.password, storedHash)) {
            throw Exception("invalid credentials")
        }

        val token = generateToken(foundUser.email)
        return Response.ok(Token(token)).build()
    }
}

data class Token (
    val token: String
)