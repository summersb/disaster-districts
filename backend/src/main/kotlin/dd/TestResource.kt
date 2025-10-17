package dd

import dd.repository.UserAccountRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response

@Path("/")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class TestResource(
    val userAccountRepository: UserAccountRepository
) {

    @GET
    @Path("/test")
    fun test(): Response {
        userAccountRepository.listAll().forEach { println(it) }
        return Response.ok("""{"hello":1} """).build()
    }
}