package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table

@Entity(name = "Users")
@Table(name = "users")
open class UserAccountDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "users_id_seq")
    @SequenceGenerator(
        name = "users_id_seq",
        sequenceName = "users_id_seq",
        allocationSize = 1
    )
    var id: Long? = null

    @Column(name = "email", length = 255)
    lateinit var email: String

    @Column(name = "password_hash", length = 255)
    var passwordHash: String? = null

    @ManyToOne
    var ward: WardDao? = null
}