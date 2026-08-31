import { expect, test } from '@playwright/test'

test('a user can request to join more than one ward at once', async ({
  page,
  request,
}) => {
  const suffix = Date.now()
  const email = `e2e-multiward-${suffix}@example.com`
  const password = 'password123'
  const secondWardName = 'E2E Second Ward'

  // Reuse a fixed-name ward across runs instead of creating a new one every
  // time - there's no ward delete endpoint, so a unique name per run would
  // leave permanent clutter behind.
  const existingWards = await (await request.get('/api/wards')).json()
  if (!existingWards.some((w: { name: string }) => w.name === secondWardName)) {
    await request.post('/api/wards', {
      data: { name: secondWardName, lat: 41.0, lng: -75.0 },
    })
  }

  await page.goto('/signup')
  await page.getByPlaceholder('you@example.com').fill(email)
  const passwordFields = page.getByPlaceholder('••••••••')
  await passwordFields.nth(0).fill(password)
  await passwordFields.nth(1).fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByRole('heading', { name: 'Join a Ward' })).toBeVisible()

  // Request Sample Ward first.
  await page.getByRole('combobox', { name: 'Select a ward' }).click()
  await page.getByRole('option', { name: 'Sample Ward' }).click()
  await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/join-requests') &&
        res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Join Ward' }).click(),
  ])
  await expect(page.getByRole('cell', { name: 'Sample Ward' })).toBeVisible()

  // The form should still be usable, offering the second ward - not
  // replaced by a "you already have a pending request" notice.
  await expect(page.getByRole('button', { name: 'Join Ward' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Select a ward' }).click()
  await expect(page.getByRole('option', { name: secondWardName })).toBeVisible()
  // Sample Ward must not be offered again - it already has a pending request.
  await expect(page.getByRole('option', { name: 'Sample Ward' })).toHaveCount(0)
  await page.getByRole('option', { name: secondWardName }).click()

  const [secondResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/join-requests') &&
        res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Join Ward' }).click(),
  ])
  expect(secondResponse.status()).toBe(201)

  // Both requests now show up, both pending.
  await expect(page.getByRole('cell', { name: 'Sample Ward' })).toBeVisible()
  await expect(page.getByRole('cell', { name: secondWardName })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Pending' })).toHaveCount(2)

  // Clean up: reject both requests so nothing lingers in the admin queue.
  const loginRes = await (
    await request.post('/api/auth/login', { data: { email, password } })
  ).json()
  const myRequests: { id: number; status: string }[] = await (
    await request.get(`/api/join-requests?userId=${loginRes.id}`)
  ).json()
  for (const r of myRequests.filter((r) => r.status === 'PENDING')) {
    await request.put(`/api/join-requests/${r.id}`, {
      data: { approve: false },
    })
  }
})
