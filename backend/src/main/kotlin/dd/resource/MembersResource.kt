package dd.resource

import dd.dao.MemberDao
import dd.geo.GeoAddress
import dd.geo.GeoPoint
import dd.geo.Geocoder
import dd.geo.distanceKm
import dd.geo.stripUnit
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
import jakarta.ws.rs.QueryParam
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
    val geocoder: Geocoder,
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

    // Bulk create used by the CSV/PDF import. Each member is saved in its own
    // transaction so one bad row doesn't roll back the rest; the response is
    // 207 Multi-Status with one result per submitted member, in request order.
    @POST
    @Path("/bulk")
    fun createMembers(members: List<MemberRequest>): Response {
        identity.requireWardManager(wardId)
        val results = members.mapIndexed { index, member ->
            val invalid = memberValidationError(member)
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

    private fun wardCenter(): GeoPoint? {
        val ward = wardId.takeIf { it > 0 }?.let { wardRepository.findById(it) } ?: return null
        val lat = ward.lat ?: return null
        val lng = ward.lng ?: return null
        return GeoPoint(lat, lng)
    }

    private fun noCenterResponse() = Response.status(Status.CONFLICT)
        .entity(mapOf("error" to "Set the ward's map center before checking member locations"))
        .build()

    private fun badRequest(message: String) =
        Response.status(Status.BAD_REQUEST).entity(mapOf("error" to message)).build()

    // Lists members whose pin is probably wrong: no coordinates at all, or
    // further than radiusKm from the ward's map center. Members with no address
    // are listed too, flagged hasAddress=false since they can't be looked up.
    // Needs the ward to have
    // a center set - there is nothing to measure against otherwise.
    @GET
    @Path("/outliers")
    fun getOutliers(@QueryParam("radiusKm") radiusKm: Double?): Response {
        val radius = radiusKm ?: DEFAULT_RADIUS_KM
        if (radius <= 0) return badRequest("radiusKm must be greater than 0")
        val center = wardCenter() ?: return noCenterResponse()
        val outliers = memberRepository.findByWard(wardId).mapNotNull { m ->
            val hasAddress = geoAddress(m).freeText.isNotBlank()
            val lat = m.lat
            val lng = m.lng
            if (lat == null || lng == null) {
                return@mapNotNull MemberOutlierDto(toDto(m), OutlierReason.missing, null, hasAddress)
            }
            val distance = distanceKm(center, GeoPoint(lat, lng))
            if (distance > radius) MemberOutlierDto(toDto(m), OutlierReason.far, distance, hasAddress) else null
        }.sortedWith(compareBy({ it.distanceKm != null }, { -(it.distanceKm ?: 0.0) }))
        return Response.ok(MemberOutliersResponse(center.lat, center.lng, radius, outliers)).build()
    }

    // Re-derives the selected members' coordinates from their address using
    // OpenStreetMap. The geocoder is rate limited to one lookup per second, so
    // this is deliberately small-batch (MAX_GEOCODE_BATCH per request) and the
    // lookups run outside any database transaction. A match is only saved if
    // it lands within radiusKm of the ward center; otherwise it is reported as
    // too_far and the member is left unchanged.
    @POST
    @Path("/geocode")
    fun geocodeMembers(request: GeocodeMembersRequest): Response {
        identity.requireWardManager(wardId)
        val radius = request.radiusKm ?: DEFAULT_RADIUS_KM
        if (radius <= 0) return badRequest("radiusKm must be greater than 0")
        if (request.memberIds.size > MAX_GEOCODE_BATCH) {
            return badRequest("At most $MAX_GEOCODE_BATCH members can be looked up per request")
        }
        val center = wardCenter() ?: return noCenterResponse()

        val results = request.memberIds.distinct().map { id ->
            try {
                val geoAddress = QuarkusTransaction.call<GeoAddress?> {
                    memberRepository.findById(id)?.takeIf { it.ward?.id == wardId }?.let { geoAddress(it) }
                } ?: return@map GeocodeMemberResult(id, GeocodeStatus.failed, error = "Member not found")
                val address = geoAddress.freeText
                if (address.isBlank()) {
                    return@map GeocodeMemberResult(id, GeocodeStatus.no_address, error = "No address on file")
                }
                val point = geocoder.geocode(geoAddress, center)
                    ?: return@map GeocodeMemberResult(id, GeocodeStatus.not_found, error = "No match for \"$address\"")
                val distance = distanceKm(center, point)
                if (distance > radius) {
                    return@map GeocodeMemberResult(
                        id, GeocodeStatus.too_far, point.lat, point.lng, distance,
                        "The match for \"$address\" is outside the ward area",
                    )
                }
                QuarkusTransaction.call<GeocodeMemberResult> {
                    val member = memberRepository.findById(id)
                        ?: return@call GeocodeMemberResult(id, GeocodeStatus.failed, error = "Member not found")
                    member.lat = point.lat
                    member.lng = point.lng
                    GeocodeMemberResult(id, GeocodeStatus.updated, point.lat, point.lng, distance)
                }
            } catch (e: Exception) {
                GeocodeMemberResult(id, GeocodeStatus.failed, error = e.message ?: "Lookup failed")
            }
        }
        val updated = results.count { it.status == GeocodeStatus.updated }
        val body = GeocodeMembersResponse(updated = updated, failed = results.size - updated, results = results)
        return Response.status(207).entity(body).build()
    }

    // Prefer the structured address parts (cleaner for a geocoder than the
    // display string); fall back to formattedAddress when they're empty.
    private fun geoAddress(m: MemberDao): GeoAddress {
        // The unit number ("#9", "Apt 23") is left off: it only stops the
        // building from being found.
        val street = m.address1?.takeIf { it.isNotBlank() }?.let { stripUnit(it) }
        val parts = listOf(street, m.city, listOfNotNull(m.state, m.postalCode).joinToString(" "))
            .mapNotNull { it?.trim()?.takeIf(String::isNotEmpty) }
        val freeText = if (street == null) m.formattedAddress?.trim().orEmpty() else parts.joinToString(", ")
        return GeoAddress(freeText = freeText, street = street, postalCode = m.postalCode)
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
        // Same for the ward, if this member is its leader. Done on the loaded
        // entity rather than with a bulk update, which would leave the ward
        // in this session still pointing at the member being removed.
        member.ward?.let { ward -> if (ward.leader?.id == id) ward.leader = null }
        memberRepository.delete(member)
        Response.noContent().build()
    }

    companion object {
        const val DEFAULT_RADIUS_KM = 25.0
        const val MAX_GEOCODE_BATCH = 25
    }
}
