package dd.repository

import dd.dao.WardJoinRequestDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class WardJoinRequestRepository : PanacheRepository<WardJoinRequestDao> {
    fun findByWardId(wardId: Long): List<WardJoinRequestDao> {
        return find("ward.id", wardId).list()
    }

    fun findByUserId(userId: Long): List<WardJoinRequestDao> {
        return find("user.id = ?1 order by requestedAt desc", userId).list()
    }

    fun findPendingByUserIdAndWardId(userId: Long, wardId: Long): WardJoinRequestDao? {
        return find(
            "user.id = ?1 and ward.id = ?2 and status = ?3",
            userId,
            wardId,
            "PENDING",
        ).firstResult()
    }
}
