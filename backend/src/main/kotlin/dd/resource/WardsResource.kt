package dd.resource

import dd.dao.WardDao
import dd.geo.Geocoder
import dd.repository.DistrictRepository
import dd.repository.MemberRepository
import dd.repository.UserAccountRepository
import dd.repository.WardRepository
import dd.security.requireWard
import dd.security.requireWardManager
import io.quarkus.security.Authenticated
import io.quarkus.security.identity.SecurityIdentity
import jakarta.annotation.security.RolesAllowed
import jakarta.enterprise.context.RequestScoped
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import jakarta.ws.rs.BadRequestException
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
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
    val identity: SecurityIdentity,
    val geocoder: Geocoder,
    val wardTransfer: WardTransferService,
    @field:Context val uriInfo: UriInfo,
) {

    private fun toDto(w: WardDao) = WardDto(id = w.id, name = w.name ?: "", lat = w.lat, lng = w.lng, leaderId = w.leader?.id)

    @GET
    @Authenticated
    fun getWards(): Response {
        return Response.ok(wardRepository.listAll().map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    @Authenticated
    fun getWard(@PathParam("id") id: Long): Response {
        val ward = wardRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(ward)).build()
    }

    @POST
    @RolesAllowed("admin")
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

    // Ward admins may correct their own ward's map center; only system
    // admins may rename it or repoint it to a different ward's data via id
    // spoofing - checked via requireWardManager since @RolesAllowed alone
    // can't express "ward_admin of *this* ward".
    @PUT
    @Path("/{id}")
    @Authenticated
    @Transactional
    fun updateWard(@PathParam("id") id: Long, ward: WardRequest): Response {
        identity.requireWardManager(id)
        val dbWard = wardRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        if (ward.name.isNotBlank() && ward.name != dbWard.name) {
            val nameConflict = wardRepository.findByName(ward.name)
            if (nameConflict != null && nameConflict.id != id) {
                return Response.status(Status.CONFLICT).build()
            }
            dbWard.name = ward.name
        }
        // Every field is optional, so the dashboard can rename the ward or
        // change its leader without resending (and wiping) the map center.
        ward.lat?.let { dbWard.lat = it }
        ward.lng?.let { dbWard.lng = it }
        ward.leaderId?.let { leaderId ->
            dbWard.leader = if (leaderId > 0) {
                // The leader has to be one of this ward's own members.
                memberRepository.findById(leaderId)?.takeIf { it.ward?.id == id }
                    ?: return Response.status(Status.BAD_REQUEST)
                        .entity(mapOf("error" to "The ward leader must be a member of this ward"))
                        .build()
            } else {
                null
            }
        }
        return Response.ok(toDto(dbWard)).build()
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("admin")
    @Transactional
    fun deleteWard(@PathParam("id") id: Long): Response {
        val ward = wardRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        // Detach/remove everything scoped to this ward before removing it -
        // members reference districts, and districts/user roles/join
        // requests all reference the ward, so the FKs would otherwise block
        // the delete.
        entityManager.createQuery("delete from WardJoinRequest r where r.ward.id = :id")
            .setParameter("id", id).executeUpdate()
        // The ward's leader is one of the members about to be bulk-deleted
        // below. Drop the reference, and detach the loaded member so the
        // session isn't left holding a member of a ward that no longer exists.
        ward.leader?.let { leader ->
            ward.leader = null
            entityManager.flush()
            entityManager.detach(leader)
        }
        entityManager.createQuery("update Member m set m.district = null where m.ward.id = :id")
            .setParameter("id", id).executeUpdate()
        entityManager.createQuery("delete from District d where d.ward.id = :id")
            .setParameter("id", id).executeUpdate()
        entityManager.createQuery("delete from Member m where m.ward.id = :id")
            .setParameter("id", id).executeUpdate()
        entityManager.createQuery("delete from UserRole r where r.ward.id = :id")
            .setParameter("id", id).executeUpdate()
        wardRepository.delete(ward)
        return Response.noContent().build()
    }

    // DistrictsResource/MembersResource are plain sub-resource locators
    // returned via `new`, not CDI beans - @RolesAllowed on their methods
    // never gets woven in (same reason @Transactional needs
    // QuarkusTransaction.call there instead). Gate ward access here, where
    // CDI security interceptors do apply, and hand the checked identity down
    // for the per-method role checks those classes still need to make.
    @Path("{wardId}/districts")
    @Authenticated
    fun getDistricts(@PathParam("wardId") wardId: Long): DistrictsResource {
        identity.requireWard(wardId)
        return DistrictsResource(districtRepository, wardRepository, memberRepository, entityManager, identity, uriInfo, wardId)
    }

    @Path("{wardId}/members")
    @Authenticated
    fun getMembers(@PathParam("wardId") wardId: Long): MembersResource {
        identity.requireWard(wardId)
        return MembersResource(memberRepository, wardRepository, entityManager, identity, uriInfo, wardId, geocoder)
    }

    // A ward's settings, districts and members as one JSON document - a
    // backup, or a way to copy the ward somewhere else. Limited to the ward's
    // managers because it carries every member's contact details in one file.
    @GET
    @Path("{wardId}/export")
    @Authenticated
    @Transactional
    fun exportWard(@PathParam("wardId") wardId: Long): Response {
        identity.requireWardManager(wardId)
        val ward = wardRepository.findById(wardId) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(wardTransfer.export(ward)).build()
    }

    // Merges an export file into this ward (see WardTransferService.import).
    // One transaction: a file that fails validation changes nothing.
    @POST
    @Path("{wardId}/import")
    @Authenticated
    @Transactional
    fun importWard(@PathParam("wardId") wardId: Long, file: WardExport): Response {
        identity.requireWardManager(wardId)
        val ward = wardRepository.findById(wardId) ?: return Response.status(Status.NOT_FOUND).build()
        return try {
            Response.ok(wardTransfer.import(ward, file)).build()
        } catch (e: BadRequestException) {
            Response.status(Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }

    @GET
    @Path("{wardId}/users")
    @RolesAllowed("admin", "ward_admin")
    @Produces(MediaType.APPLICATION_JSON)
    fun getWardUsers(@PathParam("wardId") wardId: Long): Response {
        identity.requireWard(wardId)
        val users = userAccountRepository.findByWardId(wardId).map { u ->
            UserDto(id = u.id, email = u.email, name = u.name, roles = u.getRoleList(), wardId = u.getWard()?.id)
        }
        return Response.ok(users).build()
    }
}
