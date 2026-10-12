package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.JoinTable
import jakarta.persistence.ManyToMany
import jakarta.persistence.OneToMany
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table

@Entity(name = "Users")
@Table(name = "users")
open class UserAccountDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "users_id_seq")
    @SequenceGenerator(name = "users_id_seq", sequenceName = "users_id_seq", allocationSize = 1)
    var id: Long? = null

    @Column(name = "email", length = 255)
    lateinit var email: String

    @Column(name = "name", length = 255)
    var name: String? = null

    @Column(name = "password_hash", length = 255)
    var passwordHash: String? = null

    // The member records that are this same person - at most one per ward the
    // user belongs to, linked by a ward admin.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_members",
        joinColumns = [JoinColumn(name = "user_id")],
        inverseJoinColumns = [JoinColumn(name = "member_id")],
    )
    var members: MutableSet<MemberDao> = mutableSetOf()

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var userRoles: MutableList<UserRoleDao> = mutableListOf()

    fun getRoleList(): List<String> = userRoles.map { it.role }.distinct()

    fun hasRole(role: String): Boolean = userRoles.any { it.role == role }

    /** The first ward the user belongs to - their default when none is chosen. */
    fun getWard(): WardDao? = userRoles.firstOrNull { it.ward != null }?.ward

    /** The user's roles in each ward they belong to, keyed by ward id. */
    fun wardRoles(): Map<Long, List<String>> =
        userRoles.filter { it.ward?.id != null }
            .groupBy({ it.ward!!.id!! }, { it.role })
            .mapValues { it.value.distinct() }

    fun wardIds(): Set<Long> = wardRoles().keys

    /** The member record linked to this user in [wardId], if any. */
    fun memberIn(wardId: Long?): MemberDao? = members.firstOrNull { it.ward?.id == wardId }
}
