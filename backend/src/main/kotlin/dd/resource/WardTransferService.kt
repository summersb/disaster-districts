package dd.resource

import dd.dao.DistrictDao
import dd.dao.MemberDao
import dd.dao.WardDao
import dd.repository.DistrictRepository
import dd.repository.MemberRepository
import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.BadRequestException
import java.time.Instant

/** Builds and applies ward export files (see [WardExport]). */
@ApplicationScoped
class WardTransferService(
    val memberRepository: MemberRepository,
    val districtRepository: DistrictRepository,
) {

    fun export(ward: WardDao): WardExport {
        val wardId = ward.id ?: 0
        return WardExport(
            format = WARD_EXPORT_FORMAT,
            version = WARD_EXPORT_VERSION,
            exportedAt = Instant.now().toString(),
            ward = WardExportSettings(
                name = ward.name ?: "",
                lat = ward.lat,
                lng = ward.lng,
                leaderId = ward.leader?.id,
            ),
            districts = districtRepository.findByWard(wardId).sortedBy { it.id }.map { d ->
                DistrictExport(
                    id = d.id,
                    name = d.name ?: "",
                    color = d.color,
                    lat = d.lat,
                    lng = d.lng,
                    leaderId = d.leader?.id,
                    assistantId = d.assistant?.id,
                )
            },
            members = memberRepository.findByWard(wardId).sortedBy { it.id }.map { m ->
                MemberExport(
                    id = m.id,
                    familyName = m.familyName ?: "",
                    name = m.name ?: "",
                    formattedAddress = m.formattedAddress,
                    address1 = m.address1,
                    address2 = m.address2,
                    city = m.city,
                    state = m.state,
                    postalCode = m.postalCode,
                    phone = m.phone,
                    lat = m.lat,
                    lng = m.lng,
                    notes = m.notes,
                    districtId = m.district?.id,
                )
            },
        )
    }

    /**
     * Merges [file] into [ward]. Members are matched by family name + name and
     * districts by name: matches are updated to what the file says, the rest
     * are created. Nothing is deleted - members and districts the file doesn't
     * mention are left as they are - and the ward keeps its own name. Must run
     * inside a transaction, so an invalid file changes nothing.
     */
    fun import(ward: WardDao, file: WardExport): WardImportResult {
        validate(file)
        val wardId = ward.id ?: throw BadRequestException("Ward not found")

        var membersCreated = 0
        var membersUpdated = 0
        // File id -> the member it became, for resolving leaders and so on.
        val members = HashMap<Long, MemberDao>()
        for (m in file.members) {
            val existing = memberRepository.findByWardAndName(wardId, m.familyName, m.name)
            val member = existing ?: MemberDao().also { it.ward = ward }
            member.apply {
                familyName = m.familyName
                name = m.name
                formattedAddress = m.formattedAddress ?: ""
                address1 = m.address1
                address2 = m.address2
                city = m.city
                state = m.state
                postalCode = m.postalCode
                phone = m.phone
                lat = m.lat
                lng = m.lng
                notes = m.notes
            }
            if (existing == null) {
                member.persist()
                membersCreated++
            } else {
                membersUpdated++
            }
            m.id?.let { members[it] = member }
        }

        var districtsCreated = 0
        var districtsUpdated = 0
        val districts = HashMap<Long, DistrictDao>()
        for (d in file.districts) {
            val existing = districtRepository.findByWardAndName(wardId, d.name)
            val district = existing ?: DistrictDao().also { it.ward = ward }
            district.apply {
                name = d.name
                color = d.color
                lat = d.lat
                lng = d.lng
                leader = d.leaderId?.let { members[it] }
                assistant = d.assistantId?.let { members[it] }
            }
            if (existing == null) {
                district.persist()
                districtsCreated++
            } else {
                districtsUpdated++
            }
            d.id?.let { districts[it] = district }
        }

        // Every member in the file ends up where the file puts them, including
        // in no district at all.
        for (m in file.members) {
            val member = m.id?.let { members[it] } ?: continue
            member.district = m.districtId?.let { districts[it] }
        }

        file.ward.lat?.let { ward.lat = it }
        file.ward.lng?.let { ward.lng = it }
        file.ward.leaderId?.let { members[it] }?.let { ward.leader = it }

        return WardImportResult(membersCreated, membersUpdated, districtsCreated, districtsUpdated)
    }

    private fun validate(file: WardExport) {
        if (file.format != WARD_EXPORT_FORMAT) {
            throw BadRequestException("This is not a ward export file")
        }
        if (file.version != WARD_EXPORT_VERSION) {
            throw BadRequestException("Unsupported ward export version ${file.version}")
        }
        file.members.forEachIndexed { index, m ->
            val request = MemberRequest(
                familyName = m.familyName,
                formattedAddress = m.formattedAddress ?: "",
                name = m.name,
                address1 = m.address1,
                address2 = m.address2,
                city = m.city,
                state = m.state,
                postalCode = m.postalCode,
                phone = m.phone,
            )
            memberValidationError(request)?.let {
                throw BadRequestException("Member ${index + 1} (${m.familyName}, ${m.name}): $it")
            }
        }
        file.districts.forEachIndexed { index, d ->
            if (d.name.isBlank()) throw BadRequestException("District ${index + 1} has no name")
            if (d.name.length > 255) throw BadRequestException("District ${index + 1}: name is longer than 255 characters")
            if ((d.color?.length ?: 0) > 50) throw BadRequestException("District ${d.name}: color is longer than 50 characters")
        }
    }
}
