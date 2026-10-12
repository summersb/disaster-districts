import { expect, test } from './coverage-fixtures'

test('the members table search box filters across all columns and paginates', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/member')
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()

  // 20 seeded members at 10/page - pagination controls should be present.
  await expect(page.getByText(/Page 1 of/)).toBeVisible()
  const initialRows = await page.locator('tbody tr').count()
  expect(initialRows).toBeGreaterThan(0)

  // Search matches a value from a column other than "Name" (the district).
  await page.getByPlaceholder('Search members...').fill('South District')
  const filteredRows = page.locator('tbody tr')
  await expect(filteredRows.first()).toBeVisible()
  const filteredCount = await filteredRows.count()
  expect(filteredCount).toBeGreaterThan(0)
  for (const row of await filteredRows.all()) {
    await expect(row).toContainText('South District')
  }

  // A search with no matches shows the empty state, not stale rows.
  await page.getByPlaceholder('Search members...').fill('nonexistent-xyz')
  await expect(page.getByText('No results.')).toBeVisible()
})
