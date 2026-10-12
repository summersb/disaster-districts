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
    val districtLeaders: DistrictLeaders,
) : SecurityIdentityAugmentor {

    override fun augment(identity: SecurityIdentity, context: AuthenticationRequestContext): Uni<SecurityIdentity> {
        if (identity.isAnonymous) {
            return Uni.createFrom().item(identity)
        }
        return context.runBlocking {
            // Panache needs an active transaction/persistence context, which
            // isn't established yet this early in the request pipeline -
            // open one just for this lookup.
            // The led districts are resolved inside the same transaction,
            // while the user's lazy member link can still be followed.
            val found = QuarkusTransaction.requiringNew().call<Pair<UserAccountDao, List<Long>>?> {
                userAccountRepository.findByEmail(identity.principal.name)
                    ?.let { it to districtLeaders.districtIds(it) }
            }
            val (user: UserAccountDao, ledDistrictIds) = found ?: return@runBlocking identity
            val roles = user.getRoleList().toMutableSet()
            if (ledDistrictIds.isNotEmpty()) roles += DISTRICT_LEADER_ROLE
            QuarkusSecurityIdentity.builder(identity)
                .addRoles(roles)
                .addAttribute("userId", user.id)
                .addAttribute("wardId", user.getWard()?.id)
                .addAttribute("leaderDistrictIds", ledDistrictIds.toSet())
                .build()
        }
    }
}
