import { expect, test } from '@playwright/test'
import { adminAuthHeaders } from './helpers'

async function approveAsWardAdmin(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
): Promise<{ userId: number; wardId: number }> {
  const headers = await adminAuthHeaders(request)
  await request.post('/api/users', { data: { email, password } })
  const { id: userId } = await (
    await request.post('/api/auth/login', { data: { email, password } })
  ).json()
  const wards = await (await request.get('/api/wards', { headers })).json()
  const wardId = wards[0].id

  const joinRes = await request.post('/api/join-requests', {
    headers,
    data: { userId, wardId },
  })
  const requestId = joinRes.headers().location.split('/').pop()
  await request.put(`/api/join-requests/${requestId}`, {
    headers,
    data: { approve: true, assignedRole: 'ward_admin' },
  })
  return { userId, wardId }
}

test('a ward_admin can delete a district via a confirm dialog with no crash', async ({
  page,
  request,
}) => {
  const email = `e2e-districtdelete-${Date.now()}@example.com`
  const { wardId } = await approveAsWardAdmin(request, email, 'password123')

  const districtName = `Delete Test District ${Date.now()}`
  await request.post(`/api/wards/${wardId}/districts`, {
    headers: await adminAuthHeaders(request),
    data: { name: districtName },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/district')
  await expect(page.getByText(districtName)).toBeVisible()

  // Sample Ward already has North/South District seeded, so this new one
  // is the last card in the list.
  await page.locator('svg.lucide-trash2').last().click()
  // This must open a real confirm dialog, not throw (Radix's DialogClose
  // previously wrapped two sibling buttons, which crashes with "Primitive
  // .button failed to slot onto its children").
  await expect(page.getByText('Delete district?')).toBeVisible()
  expect(pageErrors).toHaveLength(0)

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText(districtName)).toHaveCount(0)
  expect(pageErrors).toHaveLength(0)
})

test('a ward_admin can delete a member via a confirm dialog', async ({
  page,
  request,
}) => {
  const email = `e2e-memberdelete-${Date.now()}@example.com`
  const { wardId } = await approveAsWardAdmin(request, email, 'password123')

  const memberName = `Delete Test Member ${Date.now()}`
  await request.post(`/api/wards/${wardId}/members`, {
    headers: await adminAuthHeaders(request),
    data: {
      name: memberName,
      familyName: 'Test',
      formattedAddress: '1 Test St',
    },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/member')
  await page.getByPlaceholder('Search members...').fill(memberName)
  const row = page.locator('tbody tr', { hasText: memberName })
  await expect(row).toBeVisible()

  await row.locator('svg.lucide-trash2').click()
  await expect(page.getByText('Delete member?')).toBeVisible()
  expect(pageErrors).toHaveLength(0)

  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('No results.')).toBeVisible()
  expect(pageErrors).toHaveLength(0)
})

test('a plain ward member cannot see delete controls for districts or members', async ({
  page,
  request,
}) => {
  const email = `e2e-plainmember-${Date.now()}@example.com`
  const password = 'password123'
  const headers = await adminAuthHeaders(request)
  await request.post('/api/users', { data: { email, password } })
  const { id: userId } = await (
    await request.post('/api/auth/login', { data: { email, password } })
  ).json()
  const wards = await (await request.get('/api/wards', { headers })).json()
  const wardId = wards[0].id
  const joinRes = await request.post('/api/join-requests', {
    headers,
    data: { userId, wardId },
  })
  const requestId = joinRes.headers().location.split('/').pop()
  // No assignedRole - defaults to plain 'user'.
  await request.put(`/api/join-requests/${requestId}`, {
    headers,
    data: { approve: true },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/district')
  await expect(page.getByRole('heading', { name: 'Districts' })).toBeVisible()
  await expect(page.locator('svg.lucide-trash2')).toHaveCount(0)

  await page.goto('/member')
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  await expect(page.locator('svg.lucide-trash2')).toHaveCount(0)
})
