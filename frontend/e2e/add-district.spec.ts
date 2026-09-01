import { expect, test } from './coverage-fixtures'
import { adminAuthHeaders } from './helpers'

test('a newly-approved ward member can open Add District without a map crash', async ({
  page,
  request,
}) => {
  const email = `e2e-district-${Date.now()}@example.com`
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
    data: { approve: true, assignedRole: 'user' },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(/\/dashboard/)

  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/district/add')
  await expect(
    page.getByRole('heading', { name: 'Add District' }),
  ).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()

  expect(pageErrors).toHaveLength(0)
})
