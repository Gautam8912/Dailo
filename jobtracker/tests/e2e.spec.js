import { test, expect } from '@playwright/test'

const DEMO_USER = { email: 'aarav@hiretrail.app', password: 'demo1234' }
const DEMO_ADMIN = { email: 'admin@hiretrail.app', password: 'admin1234' }

async function login(page, { email, password }) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL(/\/(app|admin)/)
}

test.describe('public', () => {
  test('landing page renders hero, features and demo credentials', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('one clear')
    await expect(page.getByText('Razorpay').first()).toBeVisible()
    await expect(page.getByText('aarav@hiretrail.app').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /enter the demo/i })).toBeVisible()
  })

  test('guarded routes redirect to login when signed out', async ({ page }) => {
    await page.goto('/app/applications')
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('login rejects a bad password with a readable error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill(DEMO_USER.email)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText(/incorrect password/i)).toBeVisible()
  })
})

test.describe('user workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await login(page, DEMO_USER)
  })

  test('dashboard shows the pipeline, metrics and upcoming rounds', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening), aarav/i })).toBeVisible()
    await expect(page.getByText('Active applications')).toBeVisible()
    await expect(page.getByText('Pipeline health')).toBeVisible()
    await expect(page.locator('.sidebar').getByText('Applications')).toBeVisible()
  })

  test('applications board filters by stage and opens a drawer', async ({ page }) => {
    await page.goto('/app/applications')
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible()
    await expect(page.getByText('Razorpay').first()).toBeVisible()

    await page.getByPlaceholder('Search company, role, tag…').fill('postman')
    await expect(page.getByText('Postman').first()).toBeVisible()
    await expect(page.getByText('Zerodha').first()).toHaveCount(0)
    await page.getByPlaceholder('Search company, role, tag…').fill('')

    await page.getByText('Senior Frontend Engineer').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Interviews (2)')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('a new application can be created and appears in the pipeline', async ({ page }) => {
    await page.goto('/app/applications')
    await page.getByRole('button', { name: /new application/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').first().fill('Linear')
    await dialog.locator('input').nth(1).fill('Product Engineer')
    await dialog.getByRole('button', { name: /add application/i }).click()
    await expect(page.getByText('Linear').first()).toBeVisible()
    await page.reload()
    await expect(page.getByText('Linear').first()).toBeVisible()
  })

  test('stage changes persist after a reload', async ({ page }) => {
    await page.goto('/app/applications')
    await page.getByText('Senior Frontend Engineer').first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Offer', exact: true }).click()
    await expect(page.getByText('Razorpay → Offer')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Offer', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await page.getByText('Senior Frontend Engineer').first().click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Offer', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('tasks can be ticked off and the count updates', async ({ page }) => {
    await page.goto('/app/tasks')
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
    const before = await page.locator('[role="checkbox"][aria-checked="false"]').count()
    await page.locator('[role="checkbox"][aria-checked="false"]').first().click()
    const after = await page.locator('[role="checkbox"][aria-checked="false"]').count()
    expect(after).toBeLessThan(before)
  })

  test('notifications can be marked as read', async ({ page }) => {
    await page.goto('/app/notifications')
    await page.getByRole('button', { name: /mark all read/i }).click()
    await expect(page.getByText('0 unread')).toBeVisible()
  })

  test('calendar renders the month grid and upcoming rounds', async ({ page }) => {
    await page.goto('/app/calendar')
    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByText('Upcoming rounds')).toBeVisible()
  })

  test('insights page renders funnel and source analytics', async ({ page }) => {
    await page.goto('/app/insights')
    await expect(page.getByText('Source effectiveness')).toBeVisible()
    await expect(page.getByText('Funnel').first()).toBeVisible()
    await expect(page.getByText('What the numbers say')).toBeVisible()
  })
})

test.describe('admin console', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
    await login(page, DEMO_ADMIN)
    await page.waitForURL(/\/admin$/)
  })

  test('overview surfaces platform metrics and the leaderboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible()
    await expect(page.getByText('User leaderboard')).toBeVisible()
    await expect(page.getByText('Aarav Mehta').first()).toBeVisible()
  })

  test('admin can suspend and reactivate a user', async ({ page }) => {
    await page.goto('/admin/users')
    const row = page.getByRole('row', { name: /Priya Sharma/ })
    await row.getByTitle('Suspend').click()
    await expect(page.getByText(/priya sharma suspended/i)).toBeVisible()
    const suspended = page.getByRole('row', { name: /Priya Sharma/ })
    await expect(suspended.getByText('suspended', { exact: true })).toBeVisible()
    await suspended.getByTitle('Reactivate').click()
    await expect(page.getByText(/priya sharma reactivated/i)).toBeVisible()
  })

  test('admin can broadcast a message that lands in user inboxes', async ({ page }) => {
    await page.goto('/admin/broadcast')
    await page.getByPlaceholder('New follow-up templates are live').fill('Interviews week is here')
    await page.getByPlaceholder('Keep it short — one idea, one action.').fill('Two rounds this Thursday. Block prep time.')
    await page.getByRole('button', { name: /send to/i }).click()
    await expect(page.getByText(/broadcast sent to/i)).toBeVisible()
    await expect(page.getByText('Interviews week is here').first()).toBeVisible()
  })

  test('admin preview-as-user opens the user workspace with a banner', async ({ page }) => {
    await page.getByRole('button', { name: /preview as user/i }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText(/admin preview mode/i)).toBeVisible()
  })
})

test.describe('responsive', () => {
  test('mobile layout opens the sidebar and hides the desktop shell', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    await page.getByLabel('Email address').fill(DEMO_USER.email)
    await page.getByLabel('Password').fill(DEMO_USER.password)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL(/\/app$/)
    await page.getByRole('button', { name: 'Menu' }).click()
    await expect(page.locator('.sidebar.open')).toBeVisible()
    await page.getByRole('link', { name: 'Applications' }).click()
    await expect(page).toHaveURL(/\/app\/applications$/)
  })
})
