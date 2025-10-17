package dd.resource

import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import dd.dao.WardDao
import dd.repository.WardRepository
import jakarta.transaction.Transactional
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.UriInfo

@Path("/ward")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class WardResource(
    val wardRepository: WardRepository,
    @field:Context
    val uriInfo: UriInfo
) {

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
}