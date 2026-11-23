import { expect, type Page } from '@playwright/test'

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

export const PASSWORD = 'password-123'

/** Sign up a fresh user and create a business; ends on the Home screen. */
export async function signUpAndCreateBusiness(page: Page, businessName = "Ama's Provision Shop") {
  const email = uniqueEmail()
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByLabel('Business name').fill(businessName)
  await page.getByRole('button', { name: 'Create business' }).click()

  // Set-up asks only for the name and the kind of shop, then goes straight to Home.
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  // A new account is reminded to confirm its email. Put it off so it does not cover the screen.
  const reminder = page.getByRole('dialog')
  await reminder.waitFor({ timeout: 8000 }).catch(() => {})
  if (await reminder.isVisible()) await reminder.getByRole('button', { name: 'Later', exact: true }).click()
  return { email }
}
