import { expect, test } from '@playwright/test'

test('saving an existing district preserves its color and full member roster', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  await page.goto('/district/1')

  // Save is only rendered once the district + its members have finished
  // loading and the form has been reset with them - clicking it immediately
  // must not submit a blank color or a truncated member roster.
  const [request, response] = await Promise.all([
    page.waitForRequest(
      (req) => req.url().includes('/districts/1') && req.method() === 'PUT',
    ),
    page.waitForResponse(
      (res) =>
        res.url().includes('/districts/1') && res.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Save', exact: true }).click(),
  ])

  expect(response.status()).toBe(200)
  const body = JSON.parse(request.postData() ?? '{}')
  expect(body.color).not.toBe('')
  expect(body.memberIds.length).toBeGreaterThan(1)
})
