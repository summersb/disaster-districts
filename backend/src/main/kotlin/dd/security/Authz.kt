package dd.security

import io.quarkus.security.identity.SecurityIdentity
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotAuthorizedException

fun SecurityIdentity.isSystemAdmin(): Boolean = hasRole("admin")

fun SecurityIdentity.userId(): Long? = getAttribute<Long?>("userId")

fun SecurityIdentity.wardId(): Long? = getAttribute<Long?>("wardId")

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
