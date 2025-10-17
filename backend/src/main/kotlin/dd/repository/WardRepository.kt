package dd.repository

import dd.dao.WardDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class WardRepository : PanacheRepository<WardDao> {

    fun findByName(name: String): WardDao? {
        return find("name", name).firstResult()
    }
}