package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.GenerationType
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Column
import jakarta.persistence.ManyToOne

@Entity(name = "Member")
@Table(name = "members")
open class MemberDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "members_id_seq")
    @SequenceGenerator(
        name = "members_id_seq",
        sequenceName = "members_id_seq",
        allocationSize = 1
    )
    var id: Long? = null

    @Column(length=255)
    var familyName: String? = null
    @Column(length=255)
    var formattedAddress: String? = null
    @Column(length=255)
    var name: String? = null
    @Column(length=255)
    var address1: String? = null
    @Column(length=255)
    var address2: String? = null
    @Column(length=255)
    var city: String? = null
    @Column(length=20)
    var state: String? = null
    @Column(length=20)
    var postalCode: String? = null
    @Column(length=20)
    var phone: String?= null
    var lat: Double? = null
    var lng: Double? = null
    @Column(columnDefinition = "text")
    var notes: String? = null

    @ManyToOne
    var district: DistrictDao? = null
}