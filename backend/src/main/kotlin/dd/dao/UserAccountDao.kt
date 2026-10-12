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
import jakarta.persistence.ManyToOne
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

    // The member record for this same person, if a ward admin has linked one.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    var member: MemberDao? = null

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.EAGER)
    var userRoles: MutableList<UserRoleDao> = mutableListOf()

    fun getRoleList(): List<String> = userRoles.map { it.role }.distinct()

    fun hasRole(role: String): Boolean = userRoles.any { it.role == role }

    fun getWard(): WardDao? = userRoles.firstOrNull { it.ward != null }?.ward
}
