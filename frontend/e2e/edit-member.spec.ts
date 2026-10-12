import { expect, test } from './coverage-fixtures'
import { adminAuthHeaders } from './helpers'

test('edit member navigates from the list, loads existing data, and saves', async ({
  page,
  request,
}) => {
  const headers = await adminAuthHeaders(request)
  const memberName = `Edit Flow Test Member ${Date.now()}`
  const createRes = await request.post('/api/wards/1/members', {
    headers,
    data: {
      name: memberName,
      familyName: 'FlowTest',
      formattedAddress: '1 Test St',
    },
  })
  const memberId = createRes.headers().location.split('/').pop()

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/member')
  await page.getByPlaceholder('Search members...').fill(memberName)
  await page
    .locator('tr', { hasText: memberName })
    .getByRole('button', { name: /^Edit / })
    .click()

  // Clicking Edit must actually navigate to the member's edit page, not
  // silently do nothing (the "Edit" button previously pointed at the list
  // route itself instead of /member/$id).
  await expect(page).toHaveURL(new RegExp(`/member/${memberId}$`))
  await expect(page.getByRole('heading', { name: 'Edit Member' })).toBeVisible()
  expect(pageErrors).toHaveLength(0)

  // The existing member's data should be pre-filled, not blank.
  await expect(page.getByPlaceholder('Family name')).toHaveValue('FlowTest')

  await page.getByPlaceholder('Vista').fill('UpdatedCity')

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes(`/members/${memberId}`) &&
        res.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Save' }).click(),
  ])
  expect(response.status()).toBe(200)
  expect(pageErrors).toHaveLength(0)
  await expect(page).toHaveURL(/\/member$/)

  await request.delete(`/api/wards/1/members/${memberId}`, { headers })
})
