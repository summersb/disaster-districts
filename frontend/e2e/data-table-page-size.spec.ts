import { expect, test } from '@playwright/test'

test('the members table shows a total count and a selectable page size', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/member')
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()

  // 20 seeded members, default page size 10.
  await expect(page.getByText('20 results')).toBeVisible()
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(10)

  const pageSizeSelect = page.getByRole('combobox', { name: 'Rows per page' })

  await pageSizeSelect.click()
  await page.getByRole('option', { name: '5', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(5)
  await expect(page.getByText('Page 1 of 4')).toBeVisible()

  await pageSizeSelect.click()
  await page.getByRole('option', { name: '25', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(20)
  // Everything fits on one page now, so the pager should be hidden.
  await expect(page.getByText(/Page \d+ of/)).toHaveCount(0)

  await pageSizeSelect.click()
  await page.getByRole('option', { name: 'All' }).click()
  await expect(page.locator('tbody tr')).toHaveCount(20)
  await expect(page.getByText('20 results')).toBeVisible()

  // The total count reflects the active filter, not just the unfiltered set.
  await page.getByPlaceholder('Search members...').fill('South District')
  await expect(page.getByText('9 results')).toBeVisible()
})
