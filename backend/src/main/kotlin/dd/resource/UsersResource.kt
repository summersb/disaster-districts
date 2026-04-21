package dd.resource

import at.favre.lib.crypto.bcrypt.BCrypt
import dd.dao.UserAccountDao
import dd.dao.UserRoleDao
import dd.repository.UserAccountRepository
import dd.repository.WardRepository
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

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class UsersResource(
    val userAccountRepository: UserAccountRepository,
    val wardRepository: WardRepository,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(u: UserAccountDao) = User(
        id = u.id,
        email = u.email,
        roles = u.getRoleList(),
        wardId = u.getWard()?.id,
    )

    @GET
    fun getUsers(): Response {
        return Response.ok(userAccountRepository.listAll().map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getUser(@PathParam("id") id: Long): Response {
        val user = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(user)).build()
    }

    @POST
    @Transactional
    fun createUser(user: User): Response {
        val userExists = userAccountRepository.findByEmail(user.email)
        if (userExists != null) return Response.status(Status.CONFLICT).build()
        if (user.password == null) return Response.status(Status.BAD_REQUEST).build()
        val dbUser = UserAccountDao().apply {
            email = user.email
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
    @Transactional
    fun updateUser(@PathParam("id") id: Long, update: UserUpdate): Response {
        val dbUser = userAccountRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()

        update.roles?.let { newRoles ->
            val currentWard = dbUser.getWard()
            dbUser.userRoles.clear()
            val roles = newRoles.distinct().ifEmpty { listOf("user") }
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

        return Response.ok(toDto(dbUser)).build()
    }
}
