package dd.repository

import dd.dao.UserAccountDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class UserAccountRepository : PanacheRepository<UserAccountDao>
{
    fun findByEmail(email: String): UserAccountDao? {
        return find("email", email).firstResult()
    }
}