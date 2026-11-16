import { expect, test } from '@playwright/test'
import { signUpAndCreateBusiness } from './helpers'

test('a later payment clears what the customer owes and is not a new sale', async ({ page }) => {
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

  await page.getByRole('link', { name: 'Customers' }).click()
  await page.getByRole('link', { name: 'Kofi' }).click()
  await page.getByRole('link', { name: 'Record payment' }).click()
  await page.getByLabel('Amount received').fill('40')
  await page.getByLabel('Received into').selectOption({ label: 'Cash' })
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('status')).toContainText('Payment recorded')
  await expect(page.getByText(/Still owes/)).toContainText('0.00')
})