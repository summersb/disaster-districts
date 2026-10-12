package dd.resource

import dd.dao.UserRoleDao
import dd.dao.WardJoinRequestDao
import dd.repository.MemberRepository
import dd.repository.UserAccountRepository
import dd.repository.WardJoinRequestRepository
import dd.repository.WardRepository
import dd.security.GRANTABLE_ROLES
import dd.security.isSystemAdmin
import dd.security.requireSelfOrAdmin
import dd.security.userId
import dd.security.managedWardIds
import io.quarkus.security.Authenticated
import io.quarkus.security.identity.SecurityIdentity
import jakarta.annotation.security.RolesAllowed
import jakarta.enterprise.context.RequestScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.QueryParam
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@RequestScoped
@Path("/join-requests")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class WardJoinRequestResource(
    val wardJoinRequestRepository: WardJoinRequestRepository,
    val memberRepository: MemberRepository,
    val userAccountRepository: UserAccountRepository,
    val wardRepository: WardRepository,
    val identity: SecurityIdentity,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(r: WardJoinRequestDao) = WardJoinRequestDto(
        id = r.id,
        userId = r.user.id,
        userEmail = r.user.email,
        wardId = r.ward.id,
        wardName = r.ward.name,
        status = r.status,
        message = r.message,
        requestedAt = r.requestedAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
        assignedRole = r.assignedRole,
    )

    @POST
    @Authenticated
    @Transactional
    fun createRequest(input: WardJoinCreateRequest): Response {
        identity.requireSelfOrAdmin(input.userId)
        val user = userAccountRepository.findById(input.userId)
            ?: return Response.status(Status.NOT_FOUND).build()

        val ward = wardRepository.findById(input.wardId)
            ?: return Response.status(Status.NOT_FOUND).build()

        // Users may have pending requests to several wards at once; only
        // block a duplicate request to the same ward.
        val existingRequest = wardJoinRequestRepository.findPendingByUserIdAndWardId(
            input.userId,
            input.wardId,
        )
        if (existingRequest != null) {
            return Response.status(Status.CONFLICT).build()
        }

        val request = WardJoinRequestDao().apply {
            this.user = user
            this.ward = ward
            this.message = input.message
            this.status = "PENDING"
        }
        request.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(request.id.toString())
        return Response.created(uri.build()).build()
    }

    @GET
    @Authenticated
    fun getRequests(@QueryParam("userId") userId: Long?): Response {
        // With a userId, return that user's own requests across all statuses
        // (so they can see approvals/rejections, not just pending ones).
        // Without one, this is the admin queue: pending requests only, and a
        // ward_admin only sees their own ward's rather than every ward's.
        val requests = if (userId != null) {
            identity.requireSelfOrAdmin(userId)
            wardJoinRequestRepository.findByUserId(userId)
        } else {
            if (!identity.isSystemAdmin() && !identity.hasRole("ward_admin")) throw ForbiddenException()
            val pending = wardJoinRequestRepository.find("status", "PENDING").list()
            if (identity.isSystemAdmin()) pending else pending.filter { it.ward.id in identity.managedWardIds() }
        }
        return Response.ok(requests.map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    @Authenticated
    fun getRequest(@PathParam("id") id: Long): Response {
        val request = wardJoinRequestRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        if (!identity.isSystemAdmin() &&
            request.user.id != identity.userId() &&
            request.ward.id !in identity.managedWardIds()
        ) {
            throw ForbiddenException()
        }
        return Response.ok(toDto(request)).build()
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin", "ward_admin")
    @Transactional
    fun resolveRequest(@PathParam("id") id: Long, resolve: WardJoinResolveRequest): Response {
        val request = wardJoinRequestRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        if (!identity.isSystemAdmin()) {
            if (request.ward.id !in identity.managedWardIds()) throw ForbiddenException()
            if (resolve.assignedRole == "admin") throw ForbiddenException()
        }

        if (resolve.approve) {
            // Approve: give the user the chosen role in this ward. It is
            // added alongside whatever they hold in other wards.
            val user = request.user
            val ward = request.ward
            val newRole = resolve.assignedRole?.takeIf { it in GRANTABLE_ROLES && it != "admin" } ?: "user"
            // Checked before anything is changed, so a bad link leaves the
            // request pending.
            val linkedMember = resolve.memberId?.takeIf { it > 0 }?.let { memberId ->
                memberRepository.findById(memberId)?.takeIf { it.ward?.id == ward.id }
                    ?: return Response.status(Status.BAD_REQUEST)
                        .entity(mapOf("error" to "The member must belong to the ward being joined"))
                        .build()
            }
            user.userRoles.removeIf { it.ward?.id == ward.id }
            // The ward-less placeholder role of an account with no ward.
            user.userRoles.removeIf { it.ward == null && it.role != "admin" }
            user.userRoles.add(
                UserRoleDao().apply {
                    this.user = user
                    this.role = newRole
                    this.ward = ward
                },
            )

            linkedMember?.let { member ->
                user.members.removeIf { it.ward?.id == ward.id }
                user.members.add(member)
            }

            request.status = "APPROVED"
            request.assignedRole = newRole
        } else {
            // Reject
            request.status = "REJECTED"
        }

        request.resolvedAt = LocalDateTime.now()
        // TODO: Set resolvedBy to current user from context
        // request.resolvedBy = getCurrentUser()

        return Response.ok(toDto(request)).build()
    }
}
