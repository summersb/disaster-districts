package dd.security

import io.quarkus.security.identity.SecurityIdentity
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotAuthorizedException

fun SecurityIdentity.isSystemAdmin(): Boolean = hasRole("admin")

fun SecurityIdentity.userId(): Long? = getAttribute<Long?>("userId")

/** The caller's roles in each ward they belong to, keyed by ward id. */
fun SecurityIdentity.wardRoles(): Map<Long, Set<String>> =
    getAttribute<Map<Long, Set<String>>?>("wardRoles") ?: emptyMap()

// Access to a ward's data comes from exactly two things: being its ward
// admin, or leading (or assisting) one of its districts. Merely having an
// account attached to a ward - the `user` role - grants nothing; it only
// lets a ward admin link the account to a member, which is what makes a
// leader's account a leader's account.

/** Wards the caller is a ward admin of. */
fun SecurityIdentity.managedWardIds(): Set<Long> = wardRoles().filterValues { "ward_admin" in it }.keys

/** The districts the caller leads or assists (see [DistrictLeaders]), by ward. */
fun SecurityIdentity.leaderDistrictsByWard(): Map<Long, Set<Long>> =
    getAttribute<Map<Long, Set<Long>>?>("leaderDistrictsByWard") ?: emptyMap()

/** Every district the caller leads or assists; empty for everyone else. */
fun SecurityIdentity.leaderDistrictIds(): Set<Long> = leaderDistrictsByWard().values.flatten().toSet()

/** Wards the caller can see something of: as ward admin, or as a district leader. */
fun SecurityIdentity.accessibleWardIds(): Set<Long> = managedWardIds() + leaderDistrictsByWard().keys

/** Whether the caller is a system admin or a ward admin of [targetWardId]. */
fun SecurityIdentity.isWardManager(targetWardId: Long): Boolean =
    !isAnonymous && (isSystemAdmin() || targetWardId in managedWardIds())

/**
 * The districts of [targetWardId] the caller may see, or null when that is all
 * of them (ward admins and system admins). A district leader gets just the
 * districts they lead; their members are the only members they may see.
 */
fun SecurityIdentity.visibleDistrictIds(targetWardId: Long): Set<Long>? =
    if (isWardManager(targetWardId)) null else leaderDistrictsByWard()[targetWardId] ?: emptySet()

/**
 * Throws 401/403 unless the caller can see into [targetWardId] at all: a
 * system admin, its ward admin, or the leader of one of its districts. What
 * a leader then sees is narrowed further by [visibleDistrictIds].
 */
fun SecurityIdentity.requireWard(targetWardId: Long) {
    if (isSystemAdmin() || targetWardId in accessibleWardIds()) return
    if (isAnonymous) throw NotAuthorizedException("Bearer")
    throw ForbiddenException()
}

/** Throws 401/403 unless the caller is a system admin or is [targetUserId] themselves. */
fun SecurityIdentity.requireSelfOrAdmin(targetUserId: Long) {
    if (isSystemAdmin() || userId() == targetUserId) return
    if (isAnonymous) throw NotAuthorizedException("Bearer")
    throw ForbiddenException()
}

/** Throws 401/403 unless the caller is a system admin or a ward admin of [targetWardId]. */
fun SecurityIdentity.requireWardManager(targetWardId: Long) {
    if (isAnonymous) throw NotAuthorizedException("Bearer")
    if (isSystemAdmin()) return
    if (targetWardId in managedWardIds()) return
    throw ForbiddenException()
}
