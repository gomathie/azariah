import { expect, test } from '@playwright/test'
import { signUpAndCreateBusiness } from './helpers'

test('reverse a sale from the daybook', async ({ page }) => {
  await signUpAndCreateBusiness(page)
  await page.getByRole('link', { name: 'Add' }).click()
  await page.getByRole('link', { name: 'Add sale' }).click()
  await page.getByLabel('Sale amount').fill('10')
  await page.getByRole('button', { name: 'Save' }).click()

  await page.getByRole('link', { name: /Sale/ }).click()
  await page.getByLabel('Why are you reversing it?').fill('Entered by mistake')
  await page.getByRole('button', { name: 'Reverse this entry' }).click()
  await expect(page.getByRole('status')).toContainText('Reversed')
})
