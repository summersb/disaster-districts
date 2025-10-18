package dd.resource

import dd.dao.DistrictDao
import dd.repository.DistrictRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.enterprise.context.RequestScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.POST
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@RequestScoped
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class DistrictsResource(
    val districtRepository: DistrictRepository,
    @field:Context val uriInfo: UriInfo
) {
    var wardId: Long? = null

    @GET
    fun getDistricts(id: Long): Response {
        val wards = districtRepository.listAll()
        return Response.ok(wards).build()
    }

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