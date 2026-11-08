import { expect, test } from './coverage-fixtures'

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
  // The page also lists every user with their wards, so look only at the
  // wards table.
  const wardsTable = page.getByTestId('wards-overview')
  const sampleWardRow = wardsTable.locator('tr', { hasText: 'Sample Ward' })
  await expect(sampleWardRow).toBeVisible()
  // Sample Ward has seeded users, so its count must be a real number, not 0.
  await expect(sampleWardRow.locator('td').nth(1)).not.toHaveText('0')

  const wardName = `E2E Dashboard Ward ${Date.now()}`
  await page.getByPlaceholder('Ward name').fill(wardName)
  await page.getByRole('combobox', { name: 'Assign a ward admin' }).click()
  await page.getByRole('option', { name: email }).click()

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/wards') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Create Ward' }).click(),
  ])
  expect(response.status()).toBe(201)

  const newWardRow = wardsTable.locator('tr', { hasText: wardName })
  await expect(newWardRow).toBeVisible()
  await expect(newWardRow.getByRole('cell', { name: email })).toBeVisible()
  await expect(newWardRow.locator('td').nth(1)).toHaveText('1')

  // All Users lists the account with its permission in the new ward.
  const allUsers = page.getByTestId('all-users')
  await allUsers.getByPlaceholder('Search users...').fill(email)
  const userRow = allUsers.locator('tr', { hasText: email })
  await expect(userRow).toContainText(`${wardName} — Ward Admin`)
  await expect(userRow).toContainText('No')

  // Edit takes away their ward admin access in that ward.
  await userRow
    .getByRole('button', { name: `Edit permissions for ${email}` })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: `Access in ${wardName}` }).click()
  await page.getByRole('option', { name: 'Account only' }).click()
  await expect(userRow).toContainText(`${wardName} — Account only (no access)`)
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(newWardRow.getByRole('cell', { name: email })).toHaveCount(0)

  // Clean up the ward this test created via the UI's own delete flow -
  // exercises the confirm dialog and doubles as regression coverage for it.
  await newWardRow.getByRole('button').click()
  await expect(page.getByText('Delete ward?')).toBeVisible()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(wardsTable.locator('tr', { hasText: wardName })).toHaveCount(0)
})
