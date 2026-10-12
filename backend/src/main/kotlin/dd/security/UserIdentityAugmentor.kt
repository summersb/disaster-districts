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

// A user can belong to several wards with a different role in each, so beyond
// the flat role set the identity carries the roles per ward ("wardRoles");
// dd.security.Authz checks a request against the ward it is actually about.
//
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
            val found = QuarkusTransaction.requiringNew().call<Pair<UserAccountDao, Map<Long, Set<Long>>>?> {
                userAccountRepository.findByEmail(identity.principal.name)
                    ?.let { it to districtLeaders.districtsByWard(it) }
            }
            val (user: UserAccountDao, ledByWard) = found ?: return@runBlocking identity
            val roles = user.getRoleList().toMutableSet()
            if (ledByWard.isNotEmpty()) roles += DISTRICT_LEADER_ROLE
            QuarkusSecurityIdentity.builder(identity)
                .addRoles(roles)
                .addAttribute("userId", user.id)
                .addAttribute("wardRoles", user.wardRoles().mapValues { it.value.toSet() })
                .addAttribute("leaderDistrictsByWard", ledByWard)
                .build()
        }
    }
}
