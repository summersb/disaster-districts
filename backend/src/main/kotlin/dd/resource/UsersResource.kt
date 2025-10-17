package dd.resource

import dd.repository.UserAccountRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class UsersResource(
    val userAccountRepository: UserAccountRepository,
) {

    @GET
    fun getUsers(): Response {
        val userList = userAccountRepository.listAll()
        val dto = userList.map { User(it.email) }
        return Response.ok(dto).build()
    }

}