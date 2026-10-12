package dd.repository

import dd.dao.DistrictDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class DistrictRepository : PanacheRepository<DistrictDao> {
    fun findByWard(wardId: Long): List<DistrictDao> {
        return find("ward.id", wardId).list()
    }

    /** Districts where the member is the leader or the assistant. */
    fun findLedBy(memberId: Long): List<DistrictDao> {
        return find("leader.id = ?1 or assistant.id = ?1", memberId).list()
    }

    fun findByWardAndName(wardId: Long, name: String): DistrictDao? {
        return find("ward.id = ?1 and name = ?2", wardId, name).firstResult()
    }
}