import { expect, test } from './coverage-fixtures'
import { adminAuthHeaders } from './helpers'

test('a ward_admin manages their own ward from Ward Users, not the system Admin page', async ({
  page,
  request,
}) => {
  const email = `e2e-wardadmin-${Date.now()}@example.com`
  const password = 'password123'
  const headers = await adminAuthHeaders(request)

  await request.post('/api/users', { data: { email, password } })
  const { id: userId } = await (
    await request.post('/api/auth/login', { data: { email, password } })
  ).json()

  const wards = await (await request.get('/api/wards', { headers })).json()
  const ward = wards[0]

  const joinRes = await request.post('/api/join-requests', {
    headers,
    data: { userId, wardId: ward.id },
  })
  const location = joinRes.headers().location
  const requestId = location?.split('/').pop()
  await request.put(`/api/join-requests/${requestId}`, {
    headers,
    data: { approve: true, assignedRole: 'ward_admin' },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  // ward_admin can manage their ward's users, but isn't a system admin: no
  // Admin link, and the system page sends them back to the dashboard.
  await expect(page.getByRole('link', { name: 'Ward Users' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Admin', exact: true }),
  ).toHaveCount(0)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/dashboard/)

  // The sidebar says which ward they are in and as what.
  await expect(page.getByTestId('ward-switcher')).toContainText(ward.name)
  await expect(page.getByTestId('ward-switcher')).toContainText('Ward Admin')

  await page.goto('/ward-users')
  await expect(page.getByRole('heading', { name: 'Ward Users' })).toBeVisible()

  // Sample Ward has 50+ users, so search for this one rather than assuming
  // it's on the first page.
  await page.getByPlaceholder('Search users...').fill(email)
  await expect(page.getByRole('cell', { name: email })).toBeVisible()
})
