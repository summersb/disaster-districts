import { expect, test } from '@playwright/test'

test('a ward_admin sees the Admin page scoped to their own ward only', async ({
  page,
  request,
}) => {
  const email = `e2e-wardadmin-${Date.now()}@example.com`
  const password = 'password123'

  await request.post('/api/users', { data: { email, password } })
  const { id: userId } = await (
    await request.post('/api/auth/login', { data: { email, password } })
  ).json()

  const wards = await (await request.get('/api/wards')).json()
  const ward = wards[0]

  const joinRes = await request.post('/api/join-requests', {
    data: { userId, wardId: ward.id },
  })
  const location = joinRes.headers().location
  const requestId = location?.split('/').pop()
  await request.put(`/api/join-requests/${requestId}`, {
    data: { approve: true, assignedRole: 'ward_admin' },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  // ward_admin can manage users, but isn't a system admin.
  await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ward Requests' })).toHaveCount(0)

  await page.goto('/admin')
  await expect(
    page.getByRole('heading', { name: 'Admin Dashboard' }),
  ).toBeVisible()

  const wardSelect = page.getByRole('combobox').first()
  await expect(wardSelect).toHaveText(ward.name)
  await expect(wardSelect).toBeDisabled()

  // Sample Ward has 50+ users, so search for this one rather than assuming
  // it's on the first page.
  await page.getByPlaceholder('Search users...').fill(email)
  await expect(page.getByRole('cell', { name: email })).toBeVisible()
})
