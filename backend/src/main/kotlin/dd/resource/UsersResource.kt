package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import dd.dao.UserAccountDao
import dd.dao.UserRoleDao
import dd.repository.MemberRepository
import dd.repository.UserAccountRepository
import dd.security.GRANTABLE_ROLES
import dd.repository.WardRepository
import dd.security.isSystemAdmin
import dd.security.managedWardIds
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
    val userViews: UserViews,
    val identity: SecurityIdentity,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(u: UserAccountDao) = userViews.toDto(u)

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

    // Changes a user's standing in one ward - the ward named by `wardId`, or
    // their own ward when it is left out. A user can belong to several wards
    // with a different role in each, so nothing here touches their other
    // wards:
    //   roles           set their roles in that ward
    //   wardId alone    add them to that ward as an ordinary member
    //   removeFromWard  take them out of that ward
    //   memberId        link (or with 0, unlink) their member record there
    @PUT
    @Path("/{id}")
    @RolesAllowed("admin", "ward_admin")
    @Transactional
    fun updateUser(@PathParam("id") id: Long, update: UserUpdateRequest): Response {
        val dbUser = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        val systemAdmin = identity.isSystemAdmin()
        val targetWardId = update.wardId ?: dbUser.getWard()?.id

        if (!systemAdmin) {
            // A ward_admin acts only on wards they administer. Within those
            // they can add any account, set roles and remove people, but they
            // can't touch a system admin or grant system-admin.
            if (dbUser.hasRole("admin")) throw ForbiddenException()
            if (targetWardId == null || targetWardId !in identity.managedWardIds()) throw ForbiddenException()
            if (update.roles?.contains("admin") == true) throw ForbiddenException()
        }
        val targetWard = targetWardId?.let {
            wardRepository.findById(it) ?: return Response.status(Status.NOT_FOUND).build()
        }

        fun addRole(role: String, ward: dd.dao.WardDao?) {
            dbUser.userRoles.add(UserRoleDao().apply { this.user = dbUser; this.role = role; this.ward = ward })
        }
        // An account with no ward carries a ward-less `user` role as a
        // placeholder; it goes once they belong somewhere and comes back if
        // they are left with nothing.
        fun dropPlaceholder() = dbUser.userRoles.removeIf { it.ward == null && it.role != "admin" }
        fun ensureSomeRole() { if (dbUser.userRoles.isEmpty()) addRole("user", null) }

        when {
            update.removeFromWard -> {
                dbUser.userRoles.removeIf { it.ward?.id != null && it.ward?.id == targetWardId }
                // Their member record in that ward goes with it.
                dbUser.members.removeIf { it.ward?.id == targetWardId }
                ensureSomeRole()
            }
            update.roles != null -> {
                // Only real roles are stored. district_leader in particular is
                // derived from the member link, and clients send back the role
                // list they were shown, so it has to be dropped here.
                val wanted = update.roles.distinct().filter { it in GRANTABLE_ROLES }
                if (systemAdmin) {
                    // Only a system admin's request can grant or revoke system-admin.
                    dbUser.userRoles.removeIf { it.role == "admin" }
                    if ("admin" in wanted) addRole("admin", null)
                }
                val wardRoles = wanted.filter { it != "admin" }
                if (targetWard != null) {
                    dbUser.userRoles.removeIf { it.ward?.id == targetWard.id }
                    wardRoles.ifEmpty { listOf("user") }.forEach { addRole(it, targetWard) }
                    dropPlaceholder()
                } else {
                    dropPlaceholder()
                    if (wardRoles.isNotEmpty() || !dbUser.hasRole("admin")) {
                        wardRoles.ifEmpty { listOf("user") }.forEach { addRole(it, null) }
                    }
                }
            }
            update.wardId != null && targetWard != null -> {
                // Added alongside any other wards they already belong to.
                if (dbUser.userRoles.none { it.ward?.id == targetWard.id }) addRole("user", targetWard)
                dropPlaceholder()
            }
        }

        update.memberId?.let { memberId ->
            if (memberId > 0) {
                // A login can only stand for a member of a ward it belongs to,
                // and for one member per ward.
                val member = memberRepository.findById(memberId)
                    ?.takeIf { it.ward?.id != null && it.ward?.id in dbUser.wardIds() }
                    ?: return Response.status(Status.BAD_REQUEST)
                        .entity(mapOf("error" to "The member must belong to one of the user's wards"))
                        .build()
                if (!systemAdmin && member.ward?.id !in identity.managedWardIds()) throw ForbiddenException()
                dbUser.members.removeIf { it.ward?.id == member.ward?.id }
                dbUser.members.add(member)
            } else {
                dbUser.members.removeIf { targetWardId == null || it.ward?.id == targetWardId }
            }
        }

        return Response.ok(toDto(dbUser)).build()
    }
}
