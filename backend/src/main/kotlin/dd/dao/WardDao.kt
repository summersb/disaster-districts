package dd.dao

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.GenerationType
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.OneToMany

@Entity(name = "Ward")
@Table(name = "wards")
open class WardDao : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "wards_id_seq")
    @SequenceGenerator(
        name = "wards_id_seq",
        sequenceName = "wards_id_seq",
        allocationSize = 1
    )
    var id: Long? = null

    var name: String? = null

    @OneToMany(mappedBy = "ward")
    var districts: MutableList<DistrictDao>? = mutableListOf()
}