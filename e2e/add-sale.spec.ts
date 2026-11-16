import { expect, test } from '@playwright/test'
import { signUpAndCreateBusiness } from './helpers'

test('record a partly paid sale and see it in the daybook', async ({ page }) => {
  await signUpAndCreateBusiness(page)
  await page.getByRole('link', { name: 'Add' }).click()
  await page.getByRole('link', { name: 'Add sale' }).click()

  await page.getByLabel('Sale amount').fill('100')
  await page.getByRole('radio', { name: 'Partly paid' }).check()
  await page.getByLabel('Money received').fill('60')
  await page.getByLabel('Received into').selectOption({ label: 'Mobile Money' })
  await page.getByLabel('Name').fill('Kofi')
  await page.getByRole('button', { name: 'Add customer' }).click()
  await page.getByLabel('What did you sell?').fill('Oil')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('status')).toContainText('Sale recorded')
  await expect(page.getByRole('listitem').filter({ hasText: 'Oil' })).toBeVisible()
  await expect(page.getByText('Customer owes')).toHaveCount(0)
})
