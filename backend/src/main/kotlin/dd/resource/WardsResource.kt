package dd.resource

import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import dd.repository.WardRepository

@Path("/wards")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class WardsResource(
    val wardRepository: WardRepository,
) {

    @GET
    fun getWard(id: Long): Response {
        val wards = wardRepository.listAll()
        return Response.ok(wards).build()
    }
}