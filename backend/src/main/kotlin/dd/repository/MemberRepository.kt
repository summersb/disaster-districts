package dd.repository

import dd.dao.MemberDao
import dd.dao.WardDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class MemberRepository : PanacheRepository<MemberDao> {

    fun findByName(name: String): MemberDao? {
        return find("name", name).firstResult()
    }

    fun findByWard(id: Long): List<MemberDao> {
        return find("wardId", id).list()
    }
}