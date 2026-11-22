# Report definitions

Dates are `business_date`, inclusive. Amounts are minor units, formatted only on screen. Transfers are not sales and not expenses.

| Report | Formula |
|---|---|
| Sales | Sum of posted `sale` transaction amounts |
| Money received | Sum of posted sale and collection movements. Owner money and transfers are excluded |
| Operating expenses | Sum of posted `expense` amounts |
| Stock purchases | Sum of posted `stock_purchase` amounts |
| Customer debts | Outstanding balances from `v_customer_balances` where the balance is not zero. This is current debt, not limited by the date range |
| Account statement | Opening is the sum of that account's movements before `from`. Lines are movements inside the range. Closing is opening plus those lines |
| Cash movement | Lines include every posted movement. `counted` is false for transfers. `net_minor` excludes transfers |

The dashboard uses the same sales, money-received, expense, and stock formulas. Its net cash movement is the sum of all movements in the range, so transfers cancel. Its account list is the current balance of each account, not the balance at the end of the range.

CSV cells that start with `=`, `+`, `-`, or `@` are prefixed with `'` so a spreadsheet does not treat them as formulas.

The cash-movement check for scenarios A–H expects net 26500 minor units (GHS 265) with the transfer present and not counted. That SQL test is written and has not been run.

## Breakdowns and downloads (2026-11-22)

Each total above is unchanged. Four reports now also return `lines`, grouped in the database:

| Report | Lines | Order |
|---|---|---|
| Sales summary | One per business date: date, number of sales, amount | Oldest day first |
| Money received | One per money account: name, amount | Account order |
| Operating expenses | One per category: name, amount | Largest first |
| Stock purchases paid | One per category: name, amount | Largest first |

- The lines of a report add up to its `total_minor`. Reversed entries are left out of both.
- Customer debts shows the customer's name. Its total line is the sum of the lines the database returned.
- Account statement and cash movement show money in and money out in separate columns.
- Downloads are PDF and Excel. Both carry the shop name, the report name, the period, and "Amounts in <currency code>". Amounts are plain numbers so a spreadsheet can add them; counts are whole numbers. A cell that begins with `=` is stored as text, never as a formula.
- CSV is no longer offered. `src/utils/csv.ts` stays in the code, unused.
- Checked by `supabase/tests/0015_report_breakdowns.test.sql`, `src/features/reports/__tests__/build.spec.ts`, `src/utils/__tests__/xlsx.spec.ts`, and by opening two downloaded workbooks in Excel 16 and one PDF on 2026-11-22.
