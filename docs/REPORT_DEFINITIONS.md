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
