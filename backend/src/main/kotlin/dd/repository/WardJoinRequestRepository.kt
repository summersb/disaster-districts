package dd.repository

import dd.dao.WardJoinRequestDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class WardJoinRequestRepository : PanacheRepository<WardJoinRequestDao> {
    fun findByWardId(wardId: Long): List<WardJoinRequestDao> {
        return find("ward.id", wardId).list()
    }

    fun findByWardIdAndStatus(wardId: Long, status: String): List<WardJoinRequestDao> {
        return find("ward.id = ?1 and status = ?2", wardId, status).list()
    }

    fun findByUserId(userId: Long): List<WardJoinRequestDao> {
        return find("user.id", userId).list()
    }

    fun findPendingByUserId(userId: Long): WardJoinRequestDao? {
        return find("user.id = ?1 and status = ?2", userId, "PENDING").firstResult()
    }
}
