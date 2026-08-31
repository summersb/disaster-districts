import type { APIRequestContext } from '@playwright/test'

/**
 * Headers for a Playwright `request` fixture call authenticated as the
 * seeded system admin. The backend now requires a bearer token on nearly
 * every endpoint, but the `request` fixture (unlike the browser `page`,
 * which attaches the logged-in user's token via authFetch) sends none by
 * default - test setup/teardown calls made directly through `request` need
 * this attached explicitly.
 */
export async function adminAuthHeaders(
  request: APIRequestContext,
): Promise<{ Authorization: string }> {
  const { token } = await (
    await request.post('/api/auth/login', {
      data: { email: 'admin@example.com', password: 'password123' },
    })
  ).json()
  return { Authorization: `Bearer ${token}` }
}
