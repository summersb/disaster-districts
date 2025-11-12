package dd.resource

import dd.dao.WardDao
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import dd.repository.WardRepository
import jakarta.enterprise.context.RequestScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.POST
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@RequestScoped
@Path("/wards")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class WardsResource(
    val wardRepository: WardRepository,
    val membersResource: MembersResource,
    val districtsResource: DistrictsResource,
    @field:Context val uriInfo: UriInfo
) {

    @GET
    fun getWards(): Response {
        val wards = wardRepository.listAll()
        return Response.ok(wards).build()
    }

    @GET
    @Path("/{id}")
    fun getWard(id: Long): Response {
        val user = wardRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(user).build()
    }

    @POST
    @Transactional
    fun createWard(ward: Ward): Response {
        val wardExists = wardRepository.findByName(ward.name)
        if (wardExists != null) {
            return Response.status(Status.CONFLICT).build()
        }
        val dbWard = WardDao().apply {
            name = ward.name
        }
        dbWard.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbWard.id.toString())
        return Response.created(uri.build()).build()
    }

    @Path("{wardId}/districts")
    fun getDistricts(wardId: Long): DistrictsResource {
        districtsResource.wardId = wardId
        return districtsResource
    }

    @Path("{wardId}/members")
    fun getMembers(wardId: Long): MembersResource {
        membersResource.wardId = wardId
        return membersResource
    }
}