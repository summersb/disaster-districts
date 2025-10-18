package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import dd.dao.UserAccountDao
import dd.repository.UserAccountRepository
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class UsersResource(
    val userAccountRepository: UserAccountRepository,
    @field:Context val uriInfo: UriInfo
) {

    @GET
    fun getUsers(): Response {
        val userList = userAccountRepository.listAll()
        val dto = userList.map { User(it.email) }
        return Response.ok(dto).build()
    }

    @GET
    @Path("/{id}")
    fun getUser(id: Long): Response {
        val user = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(user).build()
    }

    @POST
    @Transactional
    fun createUser(user: User): Response {
        val userExists = userAccountRepository.findByEmail(user.email)
        if (userExists != null) {
            return Response.status(Status.CONFLICT).build()
        }
        if (user.password == null) {
            return Response.status(Status.BAD_REQUEST).build()
        }
        val dbuser = UserAccountDao().apply {
            email = user.email
            passwordHash = BCrypt.withDefaults().hashToString(12, user.password.toCharArray())
        }
        dbuser.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbuser.id.toString())
        return Response.created(uri.build()).build()
    }
}