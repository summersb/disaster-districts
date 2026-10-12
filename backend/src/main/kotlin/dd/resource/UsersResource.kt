package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import dd.dao.UserAccountDao
import dd.dao.UserRoleDao
import dd.repository.MemberRepository
import dd.repository.UserAccountRepository
import dd.security.GRANTABLE_ROLES
import dd.security.DistrictLeaders
import dd.repository.WardRepository
import dd.security.isSystemAdmin
import dd.security.wardId
import io.quarkus.security.identity.SecurityIdentity
import jakarta.annotation.security.RolesAllowed
import jakarta.transaction.Transactional
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.ForbiddenException
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

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class UsersResource(
    val userAccountRepository: UserAccountRepository,
    val wardRepository: WardRepository,
    val memberRepository: MemberRepository,
    val districtLeaders: DistrictLeaders,
    val identity: SecurityIdentity,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(u: UserAccountDao) = UserDto(
        id = u.id,
        email = u.email,
        name = u.name,
        roles = districtLeaders.roles(u),
        wardId = u.getWard()?.id,
        memberId = u.member?.id,
        leaderDistrictIds = districtLeaders.districtIds(u),
    )

    @GET
    @RolesAllowed("admin", "ward_admin")
    fun getUsers(): Response {
        return Response.ok(userAccountRepository.listAll().map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    @RolesAllowed("admin", "ward_admin")
    fun getUser(@PathParam("id") id: Long): Response {
        val user = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(user)).build()
    }

    // Deliberately unauthenticated - this is the signup endpoint, called by
    // people who don't have an account (and therefore no token) yet.
    @POST
    @Transactional
    fun createUser(user: UserRequest): Response {
        val userExists = userAccountRepository.findByEmail(user.email)
        if (userExists != null) return Response.status(Status.CONFLICT).build()
        if (user.password == null) return Response.status(Status.BAD_REQUEST).build()
        val dbUser = UserAccountDao().apply {
            email = user.email
            name = user.name
            passwordHash = BCrypt.withDefaults().hashToString(12, user.password.toCharArray())
        }
        dbUser.persist()
        val defaultRole = UserRoleDao().apply {
            this.user = dbUser
            this.role = "user"
        }
        dbUser.userRoles.add(defaultRole)
        val uri = uriInfo.absolutePathBuilder.path(dbUser.id.toString())
        return Response.created(uri.build()).build()
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin", "ward_admin")
    @Transactional
    fun updateUser(@PathParam("id") id: Long, update: UserUpdateRequest): Response {
        val dbUser = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()

        if (!identity.isSystemAdmin()) {
            // A ward_admin may manage users already in their own ward, and may
            // bring in someone who isn't in any ward yet. They can't take a
            // user from another ward, touch a system admin, grant
            // system-admin, or put anyone in a ward other than their own
            // (that's an admin-only action, used when creating a brand new
            // ward and assigning it an admin).
            if (dbUser.hasRole("admin")) throw ForbiddenException()
            val currentWardId = dbUser.getWard()?.id
            val joiningOwnWard = currentWardId == null && update.wardId != null && !update.removeFromWard
            if (currentWardId != identity.wardId() && !joiningOwnWard) throw ForbiddenException()
            if (update.roles?.contains("admin") == true) throw ForbiddenException()
            if (update.wardId != null && update.wardId != identity.wardId()) throw ForbiddenException()
        }

        update.roles?.let { newRoles ->
            val currentWard = dbUser.getWard()
            dbUser.userRoles.clear()
            // Only real roles are stored. district_leader in particular is
            // derived from the member link, and clients send back the role
            // list they were shown, so it has to be dropped here.
            val roles = newRoles.distinct().filter { it in GRANTABLE_ROLES }.ifEmpty { listOf("user") }
            roles.forEach { role ->
                val roleDao = UserRoleDao().apply {
                    this.user = dbUser
                    this.role = role
                    this.ward = if (role == "admin") null else currentWard
                }
                dbUser.userRoles.add(roleDao)
            }
        }

        when {
            update.removeFromWard -> {
                // The linked member belongs to the ward being left.
                dbUser.member = null
                dbUser.userRoles.clear()
                val defaultRole = UserRoleDao().apply {
                    this.user = dbUser
                    this.role = "user"
                }
                dbUser.userRoles.add(defaultRole)
            }
            update.wardId != null -> {
                val ward = wardRepository.findById(update.wardId)
                    ?: return Response.status(Status.NOT_FOUND).build()
                if (dbUser.member?.ward?.id != ward.id) dbUser.member = null
                val nonAdminRoles = dbUser.userRoles.filter { it.role != "admin" }
                if (nonAdminRoles.isEmpty()) {
                    val roleDao = UserRoleDao().apply {
                        this.user = dbUser
                        this.role = "user"
                        this.ward = ward
                    }
                    dbUser.userRoles.add(roleDao)
                } else {
                    nonAdminRoles.forEach { it.ward = ward }
                }
            }
        }

        update.memberId?.let { memberId ->
            dbUser.member = if (memberId > 0) {
                // A login can only stand for a member of its own ward.
                memberRepository.findById(memberId)?.takeIf { it.ward?.id != null && it.ward?.id == dbUser.getWard()?.id }
                    ?: return Response.status(Status.BAD_REQUEST)
                        .entity(mapOf("error" to "The member must belong to the user's ward"))
                        .build()
            } else {
                null
            }
        }

        return Response.ok(toDto(dbUser)).build()
    }
}
