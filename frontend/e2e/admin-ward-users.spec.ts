import { expect, test } from '@playwright/test'

test('admin can pick a ward, add a user, change their role, and remove them', async ({
  page,
  request,
}) => {
  const email = `e2e-wardusers-${Date.now()}@example.com`
  await request.post('/api/users', {
    data: { email, password: 'password123' },
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/admin')

  // The ward select should default to a real ward and load its users table.
  await expect(page.getByRole('combobox').first()).toHaveText('Sample Ward')
  await expect(
    page.getByRole('cell', { name: 'admin@example.com' }),
  ).toBeVisible()

  // Add the new user to this ward via the picker on top of the table.
  const addWardSelect = page.getByRole('combobox').nth(1)
  await addWardSelect.click()
  await page.getByRole('option', { name: email }).click()
  await page.getByRole('button', { name: 'Add' }).click()

  const row = page.locator('tr', { hasText: email })
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Member' })).toBeVisible()

  // Change their role.
  await row.getByRole('button', { name: 'Edit Roles' }).click()
  await row.getByLabel('Member').uncheck()
  await row.getByLabel('Ward Admin').check()
  await row.getByRole('button', { name: 'Save' }).click()
  await expect(row.getByRole('cell', { name: 'Ward Admin' })).toBeVisible()

  // Remove them from the ward.
  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(page.locator('tr', { hasText: email })).toHaveCount(0)
})
