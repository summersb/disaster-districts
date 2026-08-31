import { expect, test } from '@playwright/test'

test('admin dashboard shows wards with user counts and admins, and can create a ward', async ({
  page,
  request,
}) => {
  const email = `e2e-dashboardadmin-${Date.now()}@example.com`
  await request.post('/api/users', {
    data: { email, password: 'password123' },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await expect(page.getByRole('heading', { name: 'Wards' })).toBeVisible()
  const sampleWardRow = page.locator('tr', { hasText: 'Sample Ward' })
  await expect(sampleWardRow).toBeVisible()
  // Sample Ward has seeded users, so its count must be a real number, not 0.
  await expect(sampleWardRow.locator('td').nth(1)).not.toHaveText('0')

  const wardName = `E2E Dashboard Ward ${Date.now()}`
  await page.getByPlaceholder('Ward name').fill(wardName)
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: email }).click()

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/wards') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Create Ward' }).click(),
  ])
  expect(response.status()).toBe(201)

  const newWardRow = page.locator('tr', { hasText: wardName })
  await expect(newWardRow).toBeVisible()
  await expect(newWardRow.getByRole('cell', { name: email })).toBeVisible()
  await expect(newWardRow.locator('td').nth(1)).toHaveText('1')

  // Clean up the ward this test created.
  const location = await response.headerValue('location')
  const wardId = location?.split('/').pop()
  await request.delete(`/api/wards/${wardId}`)
})
