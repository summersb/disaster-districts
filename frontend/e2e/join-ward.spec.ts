import { expect, test } from '@playwright/test'

test('a new signup can see the ward list and submit a join request', async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.com`

  await page.goto('/signup')
  await page.getByPlaceholder('Jane Doe').fill('E2E Test User')
  await page.getByPlaceholder('you@example.com').fill(email)
  const passwordFields = page.getByPlaceholder('••••••••')
  await passwordFields.nth(0).fill('password123')
  await passwordFields.nth(1).fill('password123')
  await page.getByRole('button', { name: 'Sign up' }).click()

  await expect(page.getByRole('heading', { name: 'Join a Ward' })).toBeVisible()

  // The ward select should be populated from GET /api/wards, not empty.
  const wardSelect = page.getByRole('combobox', { name: 'Select a ward' })
  await wardSelect.click()
  await expect(page.getByRole('option', { name: 'Sample Ward' })).toBeVisible()
  await page.getByRole('option', { name: 'Sample Ward' }).click()

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/api/join-requests') &&
        res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Join Ward' }).click(),
  ])

  expect(response.status()).toBe(201)
  await expect(page.getByText('Failed to join ward')).toHaveCount(0)

  // The page should stay put and give feedback: a success message and the
  // request showing up in the "Your requests" table with Pending status.
  await expect(page.getByText('Request submitted')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Sample Ward' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Pending' })).toBeVisible()

  // Sample Ward now has a pending request, so it must not be offered again -
  // requesting the same ward twice while pending is a conflict.
  const stillHasForm = await page
    .getByRole('button', { name: 'Join Ward' })
    .count()
  if (stillHasForm > 0) {
    await wardSelect.click()
    await expect(page.getByRole('option', { name: 'Sample Ward' })).toHaveCount(
      0,
    )
    await page.keyboard.press('Escape')
  } else {
    await expect(
      page.getByText('You have a pending request for every ward'),
    ).toBeVisible()
  }

  // Reject the request so it doesn't linger in the admin's pending queue.
  const location = await response.headerValue('location')
  const requestId = location?.split('/').pop()
  await request.put(`/api/join-requests/${requestId}`, {
    data: { approve: false },
  })
})
