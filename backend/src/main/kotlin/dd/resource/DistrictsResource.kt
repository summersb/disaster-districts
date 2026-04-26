package dd.resource

import dd.dao.DistrictDao
import dd.repository.DistrictRepository
import dd.repository.WardRepository
import jakarta.persistence.EntityManager
import jakarta.ws.rs.Consumes
import jakarta.ws.rs.GET
import jakarta.ws.rs.Path
import jakarta.ws.rs.PathParam
import jakarta.ws.rs.Produces
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import jakarta.enterprise.context.RequestScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.DELETE
import jakarta.ws.rs.POST
import jakarta.ws.rs.PUT
import jakarta.ws.rs.core.Context
import jakarta.ws.rs.core.Response.Status
import jakarta.ws.rs.core.UriInfo

@RequestScoped
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
class DistrictsResource(
    val districtRepository: DistrictRepository,
    val wardRepository: WardRepository,
    val entityManager: EntityManager,
    @field:Context val uriInfo: UriInfo
) {
    var wardId: Long? = null

    private fun toDto(d: DistrictDao) = DistrictDto(
        id = d.id,
        name = d.name,
        color = d.color,
        lat = d.lat,
        lng = d.lng,
        wardId = d.ward?.id,
    )

    @GET
    fun getDistricts(): Response {
        // wardId == 0 is the frontend's "no ward" convention used by system /
        // ward admins who aren't tied to a single ward; in that case return
        // every district instead of scoping by ward.
        val scope = wardId?.takeIf { it > 0 }
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

    @POST
    @Transactional
    fun createDistrict(district: District): Response {
        if (district.name == null) {
            return Response.status(Status.BAD_REQUEST).build()
        }
        val districtExists = districtRepository.findByName(district.name)
        if (districtExists != null) {
            return Response.status(Status.CONFLICT).build()
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
        return Response.created(uri.build()).build()
    }

    @PUT
    @Path("/{id}")
    @Transactional
    fun updateDistrict(@PathParam("id") id: Long, district: District): Response {
        val dbDistrict = districtRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        district.name?.let { dbDistrict.name = it }
        district.color?.let { dbDistrict.color = it }
        district.lat?.let { dbDistrict.lat = it }
        district.lng?.let { dbDistrict.lng = it }
        return Response.ok(toDto(dbDistrict)).build()
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    fun deleteDistrict(@PathParam("id") id: Long): Response {
        val dbDistrict = districtRepository.findById(id) ?: return Response.status(Status.NOT_FOUND).build()
        // Detach any members pointing at this district before delete; otherwise
        // the members.district_id FK blocks the delete. The schema's leader and
        // assistant columns belong to districts itself and go away with the row.
        entityManager
            .createQuery("update Member m set m.district = null where m.district.id = :id")
            .setParameter("id", id)
            .executeUpdate()
        districtRepository.delete(dbDistrict)
        return Response.noContent().build()
    }
}