package dd.resource

import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import dd.dao.DistrictDao
import dd.dao.MemberDao
import dd.repository.MemberRepository
import jakarta.transaction.Transactional
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.UriInfo

@Path("/member")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class MemberResource(
    var memberRepository: MemberRepository,
    @field:Context
    val uriInfo: UriInfo
) {

    @GET
    @Path("/{id}")
    fun getMember(id: Long): Response {
        val member = memberRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(member).build()
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