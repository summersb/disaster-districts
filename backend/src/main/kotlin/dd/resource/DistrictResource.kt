package dd.resource

import dd.dao.UserAccountDao
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import at.favre.lib.crypto.bcrypt.BCrypt
import dd.dao.DistrictDao
import dd.repository.DistrictRepository
import jakarta.transaction.Transactional
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.UriInfo

@Path("/district")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class DistrictResource(
    val districtRepository: DistrictRepository,
    @field:Context
    val uriInfo: UriInfo
) {

    @GET
    @Path("/{id}")
    fun getDistrict(id: Long): Response {
        val district = districtRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(district).build()
    }

    @POST
    @Transactional
    fun createDistrict(district: District): Response {
        if (district.name == null) {
            return Response.status(Status.BAD_REQUEST).build()
        }
        val districtExists = districtRepository.findByName(district.name)
        if (districtExists != null) {
            return Response.status(Status.CONFLICT).build()
        }
        val dbuser = DistrictDao().apply {
            name = district.name
            color = district.color
        }
        dbuser.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbuser.id.toString())
        return Response.created(uri.build()).build()
    }
}