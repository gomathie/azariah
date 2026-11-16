import { expect, test } from '@playwright/test'
import { signUpAndCreateBusiness } from './helpers'

test('a sale saved offline syncs once and stays a single daybook row', async ({ page }) => {
  await signUpAndCreateBusiness(page)
  await page.getByRole('link', { name: 'Add' }).click()
  await page.getByRole('link', { name: 'Add sale' }).click()
  await expect(page.getByLabel('Received into')).toBeVisible()

  await page.context().setOffline(true)
  await page.getByLabel('Sale amount').fill('15')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status')).toContainText('Saved on this device')

  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Sync' }).click()
  await expect(page.getByRole('status')).toContainText('Synced')
  await expect(page.getByRole('listitem')).toHaveCount(1)

  await page.reload()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})
