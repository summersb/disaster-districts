package dd.repository

import dd.dao.MemberDao
import jakarta.enterprise.context.ApplicationScoped
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepository

@ApplicationScoped
class MemberRepository : PanacheRepository<MemberDao> {

    // "Duplicate member" means the same person (family name + given name)
    // within the same ward - not a bare `name` match, which previously
    // matched across every ward and even within one import batch could
    // false-positive on two different families sharing a given name (e.g.
    // "Smith, John" vs "Jones, John").
    fun findByWardAndName(wardId: Long?, familyName: String, name: String): MemberDao? {
        return if (wardId != null && wardId > 0) {
            find("ward.id = ?1 and familyName = ?2 and name = ?3", wardId, familyName, name).firstResult()
        } else {
            find("ward is null and familyName = ?1 and name = ?2", familyName, name).firstResult()
        }
    }

    fun findByWard(id: Long): List<MemberDao> {
        return find("ward.id", id).list()
    }
}