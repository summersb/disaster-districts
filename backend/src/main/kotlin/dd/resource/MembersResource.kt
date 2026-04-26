package dd.resource

import dd.dao.MemberDao
import dd.repository.MemberRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
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
class MembersResource(
    val memberRepository: MemberRepository,
    @field:Context val uriInfo: UriInfo
) {
    var wardId: Long? = null

    private fun toDto(m: MemberDao) = MemberDto(
        id = m.id,
        wardId = m.ward?.id,
        familyName = m.familyName,
        formattedAddress = m.formattedAddress,
        name = m.name,
        address1 = m.address1,
        address2 = m.address2,
        city = m.city,
        state = m.state,
        postalCode = m.postalCode,
        phone = m.phone,
        lat = m.lat,
        lng = m.lng,
        notes = m.notes,
        district = m.district?.let { DistrictRefDto(id = it.id, name = it.name, color = it.color) },
    )

    @GET
    fun getMembers(): Response {
        val members = wardId?.let { memberRepository.findByWard(it) }
            ?: memberRepository.listAll()
        return Response.ok(members.map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getMember(@PathParam("id") id: Long): Response {
        val member = memberRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(member)).build()
    }

    @POST
    @Transactional
    fun createMember(member: Member): Response {
        val memberExists = memberRepository.findByName(member.name)
        if (memberExists != null) {
            return Response.status(Status.CONFLICT).build()
        }
        val dbuser = MemberDao().apply {
            name = member.name
        }
        dbuser.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbuser.id.toString())
        return Response.created(uri.build()).build()
    }
}