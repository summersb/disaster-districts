package dd.repository

import dd.dao.DistrictDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class DistrictRepository : PanacheRepository<DistrictDao> {
    fun findByName(name: String): DistrictDao? {
        return find("name", name).firstResult()
    }
}