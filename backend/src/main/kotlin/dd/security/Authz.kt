package dd.security

import io.quarkus.security.identity.SecurityIdentity
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotAuthorizedException

fun SecurityIdentity.isSystemAdmin(): Boolean = hasRole("admin")

fun SecurityIdentity.userId(): Long? = getAttribute<Long?>("userId")

/** The caller's roles in each ward they belong to, keyed by ward id. */
fun SecurityIdentity.wardRoles(): Map<Long, Set<String>> =
    getAttribute<Map<Long, Set<String>>?>("wardRoles") ?: emptyMap()

/** Wards the caller belongs to in any role. */
fun SecurityIdentity.wardIds(): Set<Long> = wardRoles().keys

/** Wards the caller is a ward admin of. */
fun SecurityIdentity.managedWardIds(): Set<Long> = wardRoles().filterValues { "ward_admin" in it }.keys

/** Districts the caller leads or assists (see [DistrictLeaders]); empty for everyone else. */
fun SecurityIdentity.leaderDistrictIds(): Set<Long> = getAttribute<Set<Long>?>("leaderDistrictIds") ?: emptySet()

/** Whether the caller is a system admin or a ward admin of [targetWardId]. */
fun SecurityIdentity.isWardManager(targetWardId: Long): Boolean =
    !isAnonymous && (isSystemAdmin() || targetWardId in managedWardIds())

/** Throws 401/403 unless the caller is a system admin or belongs to [targetWardId]. */
fun SecurityIdentity.requireWard(targetWardId: Long) {
    if (isSystemAdmin() || targetWardId in wardIds()) return
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
