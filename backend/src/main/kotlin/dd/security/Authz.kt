package dd.security

import io.quarkus.security.identity.SecurityIdentity
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotAuthorizedException

fun SecurityIdentity.isSystemAdmin(): Boolean = hasRole("admin")

fun SecurityIdentity.userId(): Long? = getAttribute<Long?>("userId")

fun SecurityIdentity.wardId(): Long? = getAttribute<Long?>("wardId")

/** Districts the caller leads or assists (see [DistrictLeaders]); empty for everyone else. */
fun SecurityIdentity.leaderDistrictIds(): Set<Long> = getAttribute<Set<Long>?>("leaderDistrictIds") ?: emptySet()

/** Whether the caller is a system admin or a ward admin of [targetWardId]. */
fun SecurityIdentity.isWardManager(targetWardId: Long): Boolean =
    !isAnonymous && (isSystemAdmin() || (hasRole("ward_admin") && wardId() == targetWardId))

/** Throws 401/403 unless the caller is a system admin or belongs to [targetWardId]. */
fun SecurityIdentity.requireWard(targetWardId: Long) {
    if (isSystemAdmin() || wardId() == targetWardId) return
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
    if (hasRole("ward_admin") && wardId() == targetWardId) return
    throw ForbiddenException()
}
