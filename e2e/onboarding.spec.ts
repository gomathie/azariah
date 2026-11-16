import { expect, test } from '@playwright/test'
import { PASSWORD, signUpAndCreateBusiness } from './helpers'

test.describe('onboarding', () => {
  test('visitor is sent to the welcome screen', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome/)
    await expect(page.getByRole('heading', { name: 'Welcome to Azaria' })).toBeVisible()
  })

  test('new user signs up, creates a business and lands on Home; session survives reload', async ({ page }) => {
    const { email } = await signUpAndCreateBusiness(page)

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()

    // Sign out and back in: the business is remembered, no second onboarding.
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.evaluate(() => localStorage.clear())
    await page.context().clearCookies()
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  })

  test('business name is required', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('Email').fill(`req-${Date.now()}@example.test`)
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/onboarding/)
    await page.getByRole('button', { name: 'Create business' }).click()
    await expect(page.getByRole('alert')).toContainText('required')
  })
})
