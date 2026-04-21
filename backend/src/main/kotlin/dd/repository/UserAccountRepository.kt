package dd.repository

import dd.dao.UserAccountDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class UserAccountRepository : PanacheRepository<UserAccountDao> {
    fun findByEmail(email: String): UserAccountDao? {
        return find("email", email).firstResult()
    }

    fun findByWardId(wardId: Long): List<UserAccountDao> {
        return find("id IN (SELECT r.user.id FROM UserRole r WHERE r.ward.id = ?1)", wardId).list()
    }
}
