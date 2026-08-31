package dd.resource

import dd.dao.DistrictDao
import dd.repository.DistrictRepository
import dd.repository.MemberRepository
import dd.repository.WardRepository
import io.quarkus.narayana.jta.QuarkusTransaction
import jakarta.persistence.EntityManager
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class DistrictsResource(
    val districtRepository: DistrictRepository,
    val wardRepository: WardRepository,
    val memberRepository: MemberRepository,
    val entityManager: EntityManager,
    val uriInfo: UriInfo,
    val wardId: Long,
) {
    private fun toDto(d: DistrictDao) = DistrictDto(
        id = d.id,
        name = d.name,
        color = d.color,
        lat = d.lat,
        lng = d.lng,
        wardId = d.ward?.id,
        leaderId = d.leader?.id,
        assistantId = d.assistant?.id,
    )

    @GET
    fun getDistricts(): Response {
        // wardId == 0 is the frontend's "no ward" convention used by system /
        // ward admins who aren't tied to a single ward; in that case return
        // every district instead of scoping by ward.
        val scope = wardId.takeIf { it > 0 }
        val districts = scope?.let { districtRepository.list("ward.id", it) }
            ?: districtRepository.listAll()
        return Response.ok(districts.map { toDto(it) }).build()
    }

    @GET
    @Path("/{id}")
    fun getDistrict(@PathParam("id") id: Long): Response {
        val district = districtRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        return Response.ok(toDto(district)).build()
    }

    // This class is a JAX-RS sub-resource locator (see WardsResource.getDistricts),
    // returned via a plain `new` rather than CDI, so @Transactional interceptors
    // never get woven in here. QuarkusTransaction.call() opens/commits a
    // transaction programmatically instead.

    @POST
    fun createDistrict(district: DistrictRequest): Response = QuarkusTransaction.call<Response> {
        if (district.name == null) {
            return@call Response.status(Status.BAD_REQUEST).build()
        }
        val districtExists = districtRepository.findByName(district.name)
        if (districtExists != null) {
            return@call Response.status(Status.CONFLICT).build()
        }
        val dbDistrict = DistrictDao().apply {
            name = district.name
            color = district.color
            lat = district.lat
            lng = district.lng
            ward = wardId?.let { wardRepository.findById(it) }
        }
        dbDistrict.persist()
        val uri = uriInfo.getAbsolutePathBuilder().path(dbDistrict.id.toString())
        Response.created(uri.build()).build()
    }

    @PUT
    @Path("/{id}")
    fun updateDistrict(@PathParam("id") id: Long, district: DistrictRequest): Response = QuarkusTransaction.call<Response> {
        val dbDistrict = districtRepository.findById(id) ?: return@call Response.status(Status.NOT_FOUND).build()
        district.name?.let { dbDistrict.name = it }
        district.color?.let { dbDistrict.color = it }
        district.lat?.let { dbDistrict.lat = it }
        district.lng?.let { dbDistrict.lng = it }
        // Leader/assistant: a value of 0 (or negative) clears the slot; a real
        // id reassigns. null in the payload leaves the existing value alone.
        district.leaderId?.let {
            dbDistrict.leader = if (it > 0) memberRepository.findById(it) else null
        }
        district.assistantId?.let {
            dbDistrict.assistant = if (it > 0) memberRepository.findById(it) else null
        }
        // Member roster: when memberIds is supplied, treat it as the canonical
        // list of members for this district. Members in the list get this
        // district's id; members previously in this district but absent from
        // the list are detached (district_id = null). This handles the "click
        // to move from another district" case in one request.
        district.memberIds?.let { ids ->
            if (ids.isNotEmpty()) {
                entityManager
                    .createQuery(
                        "update Member m set m.district = :district where m.id in :ids"
                    )
                    .setParameter("district", dbDistrict)
                    .setParameter("ids", ids)
                    .executeUpdate()
                entityManager
                    .createQuery(
                        "update Member m set m.district = null where m.district.id = :id and m.id not in :ids"
                    )
                    .setParameter("id", id)
                    .setParameter("ids", ids)
                    .executeUpdate()
            } else {
                entityManager
                    .createQuery("update Member m set m.district = null where m.district.id = :id")
                    .setParameter("id", id)
                    .executeUpdate()
            }
        }
        Response.ok(toDto(dbDistrict)).build()
    }

    @DELETE
    @Path("/{id}")
    fun deleteDistrict(@PathParam("id") id: Long): Response = QuarkusTransaction.call<Response> {
        if (districtRepository.findById(id) == null) return@call Response.status(Status.NOT_FOUND).build()
        // Detach any members pointing at this district before delete; otherwise
        // the members.district_id FK blocks the delete. The schema's leader and
        // assistant columns belong to districts itself and go away with the row.
        entityManager
            .createQuery("update Member m set m.district = null where m.district.id = :id")
            .setParameter("id", id)
            .executeUpdate()
        // The district's leader/assistant (@ManyToOne, eager by default) were
        // loaded into the session by the findById above. That Member's
        // .district field is now stale relative to the bulk update just run
        // (which bypasses the persistence context), so without clearing,
        // Hibernate finds a persistent Member still pointing at the
        // about-to-be-deleted district at flush time and throws
        // TransientPropertyValueException. Clear and re-fetch fresh.
        entityManager.clear()
        val dbDistrict = districtRepository.findById(id) ?: return@call Response.status(Status.NOT_FOUND).build()
        districtRepository.delete(dbDistrict)
        Response.noContent().build()
    }
}