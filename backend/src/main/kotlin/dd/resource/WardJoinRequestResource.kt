package dd.resource

import dd.dao.UserRoleDao
import dd.dao.WardJoinRequestDao
import dd.repository.UserAccountRepository
import dd.repository.WardJoinRequestRepository
import dd.repository.WardRepository
import jakarta.enterprise.context.RequestScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
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
    val userAccountRepository: UserAccountRepository,
    val wardRepository: WardRepository,
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
    @Transactional
    fun createRequest(input: WardJoinCreateRequest): Response {
        val user = userAccountRepository.findById(input.userId)
            ?: return Response.status(Status.NOT_FOUND).build()

        val ward = wardRepository.findById(input.wardId)
            ?: return Response.status(Status.NOT_FOUND).build()

        // Check if user already has a pending request
        val existingRequest = wardJoinRequestRepository.findPendingByUserId(input.userId)
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
    fun getRequests(): Response {
        val requests = wardJoinRequestRepository.find("status", "PENDING").list()
        return Response.ok(requests.map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getRequest(@PathParam("id") id: Long): Response {
        val request = wardJoinRequestRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(request)).build()
    }

    @PUT
    @Path("/{id}")
    @Transactional
    fun resolveRequest(@PathParam("id") id: Long, resolve: WardJoinResolveRequest): Response {
        val request = wardJoinRequestRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()

        if (resolve.approve) {
            // Approve: set user's ward and optionally update role
            val user = request.user
            val ward = request.ward

            // Clear existing non-admin roles and add new role with ward assignment
            val adminRoles = user.userRoles.filter { it.role == "admin" }
            user.userRoles.clear()

            val newRole = resolve.assignedRole ?: "user"
            val roleDao = UserRoleDao().apply {
                this.user = user
                this.role = newRole
                this.ward = ward
            }
            user.userRoles.add(roleDao)

            // Re-add admin roles (they don't have ward assignments)
            adminRoles.forEach { adminRole ->
                val adminRoleDao = UserRoleDao().apply {
                    this.user = user
                    this.role = adminRole.role
                }
                user.userRoles.add(adminRoleDao)
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
