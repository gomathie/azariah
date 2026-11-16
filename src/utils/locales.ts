/** Selectable countries with a suggested currency and timezone. Not a tax or compliance list. */
export const COUNTRIES = [
  { code: 'GH', name: 'Ghana', currency: 'GHS', timezone: 'Africa/Accra' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', timezone: 'Africa/Lusaka' },
  { code: 'CD', name: 'DR Congo', currency: 'CDF', timezone: 'Africa/Kinshasa' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', timezone: 'Africa/Abidjan' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', timezone: 'Africa/Dakar' },
  { code: 'TG', name: 'Togo', currency: 'XOF', timezone: 'Africa/Lome' },
  { code: 'BJ', name: 'Benin', currency: 'XOF', timezone: 'Africa/Porto-Novo' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', timezone: 'Africa/Ouagadougou' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', timezone: 'Africa/Douala' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', timezone: 'Africa/Kampala' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', timezone: 'Africa/Kigali' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLE', timezone: 'Africa/Freetown' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', timezone: 'Africa/Monrovia' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
] as const

/** ISO 4217 currencies with minor units. The server stores `minor_unit` on the business. */
export const CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian cedi', minorUnit: 2 },
  { code: 'NGN', name: 'Nigerian naira', minorUnit: 2 },
  { code: 'KES', name: 'Kenyan shilling', minorUnit: 2 },
  { code: 'ZMW', name: 'Zambian kwacha', minorUnit: 2 },
  { code: 'CDF', name: 'Congolese franc', minorUnit: 2 },
  { code: 'XOF', name: 'West African CFA franc', minorUnit: 0 },
  { code: 'XAF', name: 'Central African CFA franc', minorUnit: 0 },
  { code: 'TZS', name: 'Tanzanian shilling', minorUnit: 2 },
  { code: 'UGX', name: 'Ugandan shilling', minorUnit: 0 },
  { code: 'RWF', name: 'Rwandan franc', minorUnit: 0 },
  { code: 'ZAR', name: 'South African rand', minorUnit: 2 },
  { code: 'SLE', name: 'Sierra Leonean leone', minorUnit: 2 },
  { code: 'LRD', name: 'Liberian dollar', minorUnit: 2 },
  { code: 'USD', name: 'US dollar', minorUnit: 2 },
  { code: 'GBP', name: 'Pound sterling', minorUnit: 2 },
  { code: 'EUR', name: 'Euro', minorUnit: 2 },
] as const

export function minorUnitFor(currency: string): number {
  return CURRENCIES.find((c) => c.code === currency)?.minorUnit ?? 2
}
