package dd.security

import dd.dao.UserAccountDao
import dd.repository.UserAccountRepository
import io.quarkus.narayana.jta.QuarkusTransaction
import io.quarkus.security.identity.AuthenticationRequestContext
import io.quarkus.security.identity.SecurityIdentity
import io.quarkus.security.identity.SecurityIdentityAugmentor
import io.quarkus.security.runtime.QuarkusSecurityIdentity
import io.smallrye.mutiny.Uni
import jakarta.enterprise.context.ApplicationScoped

// Roles and ward membership can change at any time (an admin edits a user's
// roles, approves a join request, etc.) and must take effect immediately, so
// they are looked up fresh from the database on every request rather than
// baked into the JWT itself - a long-lived token would otherwise keep acting
// on stale permissions until it expires.
@ApplicationScoped
class UserIdentityAugmentor(
    val userAccountRepository: UserAccountRepository,
) : SecurityIdentityAugmentor {

    override fun augment(identity: SecurityIdentity, context: AuthenticationRequestContext): Uni<SecurityIdentity> {
        if (identity.isAnonymous) {
            return Uni.createFrom().item(identity)
        }
        return context.runBlocking {
            // Panache needs an active transaction/persistence context, which
            // isn't established yet this early in the request pipeline -
            // open one just for this lookup.
            val user: UserAccountDao? = QuarkusTransaction.requiringNew().call<UserAccountDao?> {
                userAccountRepository.findByEmail(identity.principal.name)
            }
            if (user == null) return@runBlocking identity
            QuarkusSecurityIdentity.builder(identity)
                .addRoles(user.getRoleList().toSet())
                .addAttribute("userId", user.id)
                .addAttribute("wardId", user.getWard()?.id)
                .build()
        }
    }
}
