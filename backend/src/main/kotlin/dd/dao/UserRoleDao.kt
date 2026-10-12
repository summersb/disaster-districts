package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table

@Entity(name = "UserRole")
@Table(name = "user_roles")
open class UserRoleDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "user_roles_id_seq")
    @SequenceGenerator(name = "user_roles_id_seq", sequenceName = "user_roles_id_seq", allocationSize = 1)
    var id: Long? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    lateinit var user: UserAccountDao

    @Column(name = "role", length = 50, nullable = false)
    lateinit var role: String

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ward_id")
    var ward: WardDao? = null
}
