package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.GenerationType
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Column
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany

@Entity(name = "District")
@Table(name = "districts")
open class DistrictDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "districts_id_seq")
    @SequenceGenerator(
        name = "districts_id_seq",
        sequenceName = "districts_id_seq",
        allocationSize = 1
    )
    var id: Long? = null

    @Column(length=255)
    var name: String? = null
    @Column(length=50)
    var color: String? = null

    var lat: Double? = null
    var lng: Double? = null

    @OneToMany(mappedBy = "district")
    var members: MutableList<MemberDao>? = mutableListOf()
    @ManyToOne
    var ward: WardDao? = null

    @ManyToOne
    @JoinColumn(name = "leader")
    var leader: MemberDao? = null

    @ManyToOne
    @JoinColumn(name = "assistant")
    var assistant: MemberDao? = null
}