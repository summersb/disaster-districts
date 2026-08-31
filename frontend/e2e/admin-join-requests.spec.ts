import { expect, test } from '@playwright/test'

test('admin can view and approve a pending ward join request', async ({
  page,
  request,
}) => {
  const email = `e2e-approve-${Date.now()}@example.com`
  const password = 'password123'

  await request.post('/api/users', { data: { email, password } })
  const loginRes = await request.post('/api/auth/login', {
    data: { email, password },
  })
  const { id: userId } = await loginRes.json()

  const wards = await (await request.get('/api/wards')).json()
  const ward = wards[0]

  const joinRes = await request.post('/api/join-requests', {
    data: { userId, wardId: ward.id },
  })
  expect(joinRes.status()).toBe(201)

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In' }).click()

  // Admin has no ward of their own and must land on the dashboard, not /join-ward.
  await page.waitForURL(/\/dashboard/)

  await page.goto('/admin/join-requests')
  await expect(page).toHaveURL(/\/admin\/join-requests/)

  const row = page.locator('div.rounded-md', { hasText: email })
  await expect(row).toBeVisible()
  await expect(row).toContainText(`Wants to join ${ward.name}`)

  const [resolveResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/join-requests/') &&
        res.request().method() === 'PUT',
    ),
    row.getByRole('button', { name: 'Approve' }).click(),
  ])

  expect(resolveResponse.status()).toBe(200)
  await expect(page.getByText(email)).toHaveCount(0)
})
