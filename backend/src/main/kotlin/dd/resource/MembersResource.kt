package dd.resource

import dd.repository.MemberRepository
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import dd.repository.WardRepository

@Path("/members")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class MembersResource(
    val memberRepository: MemberRepository
) {

    @GET
    fun getMembers(): Response {
        val wards = memberRepository.listAll()
        return Response.ok(wards).build()
    }

    @GET
    @Path("/{id}")
    fun getWardMembers(id:Long): Response {
        return Response.ok(memberRepository.findByWard(id)).build()
    }
}