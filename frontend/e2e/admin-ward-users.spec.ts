import { expect, test } from './coverage-fixtures'

test('admin can enter a ward, add a user, change their role, and remove them', async ({
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

  // A system admin starts outside any ward; a ward's users are managed from
  // inside it, so step into Sample Ward with the switcher first.
  await page.getByRole('combobox', { name: 'Switch ward' }).click()
  await page.getByRole('option', { name: 'Sample Ward', exact: true }).click()
  await page.getByRole('link', { name: 'Ward Users' }).click()
  await expect(page.getByRole('heading', { name: 'Ward Users' })).toBeVisible()
  await page.getByPlaceholder('Search users...').fill('user1@example.com')
  await expect(
    page.getByRole('cell', { name: 'user1@example.com' }),
  ).toBeVisible()
  await page.getByPlaceholder('Search users...').fill('')

  // Add the new user to this ward via the picker on top of the table.
  const addWardSelect = page.getByRole('combobox', {
    name: 'Add a user to this ward',
  })
  await addWardSelect.click()
  await page.getByRole('option', { name: email }).click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  // The ward has 50+ users, so the new row may be off the first page -
  // search for it, which also exercises the table's search box.
  await page.getByPlaceholder('Search users...').fill(email)

  const row = page.locator('tr', { hasText: email })
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: 'Member' })).toBeVisible()

  // Change their role.
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  await row.getByLabel('Member').uncheck()
  await row.getByLabel('Ward Admin').check()
  await row.getByRole('button', { name: 'Save' }).click()
  await expect(row.getByRole('cell', { name: 'Ward Admin' })).toBeVisible()

  // Remove them from the ward.
  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(page.locator('tr', { hasText: email })).toHaveCount(0)
})
