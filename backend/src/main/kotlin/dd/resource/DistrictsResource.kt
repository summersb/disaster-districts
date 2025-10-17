package dd.resource

import dd.repository.DistrictRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import dd.repository.WardRepository

@Path("/districts")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class DistrictsResource(
    val districtRepository: DistrictRepository
) {

    @GET
    fun getWard(id: Long): Response {
        val wards = districtRepository.listAll()
        return Response.ok(wards).build()
    }
}