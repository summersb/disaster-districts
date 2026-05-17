package dd.resource

import dd.dao.WardDao
import dd.repository.DistrictRepository
import dd.repository.MemberRepository
import dd.repository.UserAccountRepository
import dd.repository.WardRepository
import jakarta.enterprise.context.RequestScoped
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.POST
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@RequestScoped
@Path("/wards")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class WardsResource(
    val wardRepository: WardRepository,
    val userAccountRepository: UserAccountRepository,
    val districtRepository: DistrictRepository,
    val memberRepository: MemberRepository,
    val entityManager: EntityManager,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(w: WardDao) = WardDto(id = w.id, name = w.name ?: "", lat = w.lat, lng = w.lng)

    @GET
    fun getWards(): Response {
        return Response.ok(wardRepository.listAll().map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getWard(@PathParam("id") id: Long): Response {
        val ward = wardRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(ward)).build()
    }

    @POST
    @Transactional
    fun createWard(ward: WardRequest): Response {
        val wardExists = wardRepository.findByName(ward.name)
        if (wardExists != null) {
            return Response.status(Status.CONFLICT).build()
        }
        val dbWard = WardDao().apply {
            name = ward.name
            lat = ward.lat
            lng = ward.lng
        }
        dbWard.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbWard.id.toString())
        return Response.created(uri.build()).build()
    }

    @Path("{wardId}/districts")
    fun getDistricts(@PathParam("wardId") wardId: Long): DistrictsResource {
        return DistrictsResource(districtRepository, wardRepository, memberRepository, entityManager, uriInfo, wardId)
    }

    @Path("{wardId}/members")
    fun getMembers(@PathParam("wardId") wardId: Long): MembersResource {
        return MembersResource(memberRepository, uriInfo, wardId)
    }

    @GET
    @Path("{wardId}/users")
    @Produces(MediaType.APPLICATION_JSON)
    fun getWardUsers(@PathParam("wardId") wardId: Long): Response {
        val users = userAccountRepository.findByWardId(wardId).map { u ->
            UserDto(id = u.id, email = u.email, roles = u.getRoleList(), wardId = u.getWard()?.id)
        }
        return Response.ok(users).build()
    }
}