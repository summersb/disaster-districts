package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "WardJoinRequest")
@Table(name = "ward_join_requests")
open class WardJoinRequestDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ward_join_requests_id_seq")
    @SequenceGenerator(
        name = "ward_join_requests_id_seq",
        sequenceName = "ward_join_requests_id_seq",
        allocationSize = 1
    )
    var id: Long? = null

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    lateinit var user: UserAccountDao

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ward_id", nullable = false)
    lateinit var ward: WardDao

    var status: String = "PENDING" // PENDING, APPROVED, REJECTED

    var message: String? = null

    var requestedAt: LocalDateTime = LocalDateTime.now()

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "resolved_by")
    var resolvedBy: UserAccountDao? = null

    var resolvedAt: LocalDateTime? = null

    var assignedRole: String? = null
}
