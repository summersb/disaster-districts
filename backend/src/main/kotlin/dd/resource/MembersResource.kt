package dd.resource

import dd.dao.MemberDao
import dd.repository.MemberRepository
import dd.repository.WardRepository
import dd.security.requireWardManager
import io.quarkus.narayana.jta.QuarkusTransaction
import io.quarkus.security.identity.SecurityIdentity
import jakarta.persistence.EntityManager
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class MembersResource(
    val memberRepository: MemberRepository,
    val wardRepository: WardRepository,
    val entityManager: EntityManager,
    val identity: SecurityIdentity,
    val uriInfo: UriInfo,
    val wardId: Long,
) {
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
        // wardId == 0 is the frontend's "no ward" convention used by system /
        // ward admins who aren't tied to a single ward; in that case return
        // every member instead of scoping by ward.
        val scope = wardId.takeIf { it > 0 }
        val members = scope?.let { memberRepository.findByWard(it) }
            ?: memberRepository.listAll()
        return Response.ok(members.map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getMember(@PathParam("id") id: Long): Response {
        val member = memberRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(member)).build()
    }

    // This class is a JAX-RS sub-resource locator (see WardsResource.getMembers),
    // returned via a plain `new` rather than CDI, so @Transactional interceptors
    // never get woven in here. QuarkusTransaction.call() opens/commits a
    // transaction programmatically instead. The same applies to @RolesAllowed,
    // so mutating methods below check identity.requireWardManager() by hand -
    // WardsResource.getMembers already verified ward membership before this
    // instance was even constructed.
    @POST
    fun createMember(member: MemberRequest): Response = QuarkusTransaction.call<Response> {
        identity.requireWardManager(wardId)
        val memberExists = memberRepository.findByWardAndName(wardId, member.familyName, member.name)
        if (memberExists != null) {
            return@call Response.status(Status.CONFLICT).build()
        }
        val dbuser = newMember(member)
        dbuser.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbuser.id.toString())
        Response.created(uri.build()).build()
    }

    private fun newMember(member: MemberRequest) = MemberDao().apply {
        familyName = member.familyName
        formattedAddress = member.formattedAddress
        name = member.name
        address1 = member.address1
        address2 = member.address2
        city = member.city
        state = member.state
        postalCode = member.postalCode
        phone = member.phone
        lat = member.lat
        lng = member.lng
        notes = member.notes
        ward = wardId.takeIf { it > 0 }?.let { wardRepository.findById(it) }
    }

    // Checks the things the members table would otherwise reject with an
    // opaque SQL error (NOT NULL / varchar length), so a bulk import can tell
    // the user which member is wrong and why.
    private fun validationError(member: MemberRequest): String? {
        if (member.familyName.isBlank() && member.name.isBlank()) return "Name is required"
        if (member.formattedAddress == null) return "Address is required"
        val limits = listOf(
            Triple("Family name", member.familyName, 255),
            Triple("Name", member.name, 255),
            Triple("Address", member.formattedAddress, 255),
            Triple("Address line 1", member.address1, 255),
            Triple("Address line 2", member.address2, 255),
            Triple("City", member.city, 255),
            Triple("State", member.state, 20),
            Triple("Postal code", member.postalCode, 20),
            Triple("Phone", member.phone, 20),
        )
        return limits.firstOrNull { (_, value, max) -> (value?.length ?: 0) > max }
            ?.let { (label, _, max) -> "$label is longer than $max characters" }
    }

    // Bulk create used by the CSV/PDF import. Each member is saved in its own
    // transaction so one bad row doesn't roll back the rest; the response is
    // 207 Multi-Status with one result per submitted member, in request order.
    @POST
    @Path("/bulk")
    fun createMembers(members: List<MemberRequest>): Response {
        identity.requireWardManager(wardId)
        val results = members.mapIndexed { index, member ->
            val invalid = validationError(member)
            if (invalid != null) {
                return@mapIndexed MemberImportResult(index, MemberImportStatus.failed, error = invalid)
            }
            try {
                QuarkusTransaction.call<MemberImportResult> {
                    if (memberRepository.findByWardAndName(wardId, member.familyName, member.name) != null) {
                        MemberImportResult(index, MemberImportStatus.skipped, error = "Already exists")
                    } else {
                        val dbMember = newMember(member)
                        dbMember.persist()
                        MemberImportResult(index, MemberImportStatus.created, id = dbMember.id)
                    }
                }
            } catch (e: Exception) {
                val cause = generateSequence<Throwable>(e) { it.cause }.last()
                MemberImportResult(index, MemberImportStatus.failed, error = cause.message ?: "Could not save member")
            }
        }
        val body = MemberImportResponse(
            created = results.count { it.status == MemberImportStatus.created },
            skipped = results.count { it.status == MemberImportStatus.skipped },
            failed = results.count { it.status == MemberImportStatus.failed },
            results = results,
        )
        return Response.status(207).entity(body).build()
    }

    @PUT
    @Path("/{id}")
    fun updateMember(@PathParam("id") id: Long, member: MemberRequest): Response = QuarkusTransaction.call<Response> {
        identity.requireWardManager(wardId)
        val dbMember = memberRepository.findById(id) ?: return@call Response.status(Status.NOT_FOUND).build()
        val nameConflict = memberRepository.findByWardAndName(wardId, member.familyName, member.name)
        if (nameConflict != null && nameConflict.id != id) {
            return@call Response.status(Status.CONFLICT).build()
        }
        dbMember.apply {
            familyName = member.familyName
            formattedAddress = member.formattedAddress
            name = member.name
            address1 = member.address1
            address2 = member.address2
            city = member.city
            state = member.state
            postalCode = member.postalCode
            phone = member.phone
            lat = member.lat
            lng = member.lng
            notes = member.notes
        }
        Response.ok(toDto(dbMember)).build()
    }

    @DELETE
    @Path("/{id}")
    fun deleteMember(@PathParam("id") id: Long): Response = QuarkusTransaction.call<Response> {
        identity.requireWardManager(wardId)
        val member = memberRepository.findById(id) ?: return@call Response.status(Status.NOT_FOUND).build()
        // Districts referencing this member as leader/assistant would
        // otherwise block the delete via FK constraint.
        entityManager.createQuery("update District d set d.leader = null where d.leader.id = :id")
            .setParameter("id", id).executeUpdate()
        entityManager.createQuery("update District d set d.assistant = null where d.assistant.id = :id")
            .setParameter("id", id).executeUpdate()
        memberRepository.delete(member)
        Response.noContent().build()
    }
}
