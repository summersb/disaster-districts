import { expect, test } from './coverage-fixtures'
import { adminAuthHeaders } from './helpers'

test('add member renders and can create a member', async ({
  page,
  request,
}) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@example.com')
  await page.getByPlaceholder('••••••••').fill('password123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await page.waitForURL(/\/dashboard/)

  const pageErrors: string[] = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto('/member')
  await page.getByRole('button', { name: 'Add Member' }).click()
  await expect(page.getByRole('heading', { name: 'Add Member' })).toBeVisible()
  expect(pageErrors).toHaveLength(0)

  const name = `E2E Test Member ${Date.now()}`
  await page.getByPlaceholder('Family name').fill('E2ETest')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name)
  await page.getByPlaceholder('123 Street').fill('42 Test Ave')
  await page.getByPlaceholder('Vista').fill('Testville')

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.url().includes('/members') && res.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Save' }).click(),
  ])
  expect(response.status()).toBe(201)
  expect(pageErrors).toHaveLength(0)

  // Clean up the member this test created. The backend's Location header
  // is built without the /api prefix nginx adds, so pull out the
  // ward/members/id segments and rebuild the path instead of reusing it as-is.
  const location = await response.headerValue('location')
  const segments = location?.split('/').slice(-4)
  if (segments) {
    await request.delete(`/api/${segments.join('/')}`, {
      headers: await adminAuthHeaders(request),
    })
  }
})
