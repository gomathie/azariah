# Offline sync

Dexie database `azaria`, store `pending_operations`.

A sale or an expense is saved on the phone when `navigator.onLine` is false, or when the RPC fails with a network error. The row keeps the same `client_operation_id` the server uses for idempotency. The screen says "Saved on this device" and returns to the daybook.

## States

| State | Meaning |
|---|---|
| `saved_on_device` | Waiting |
| `syncing` | The current send |
| `synced` | The server accepted it and the local row was deleted |
| `needs_attention` | The server rejected it (`AZ_*`), or the row belongs to a different signed-in user |

## Send order

`syncAll` reads rows by `createdAt` and sends them in that order. Success, including a replay of an operation the server already stored, deletes the row. A network failure puts it back to `saved_on_device` and adds 1 to `attempts`. The user taps Sync on the daybook or on the Sync screen.

## Limits

Collections, transfers, reversals, and invites are not queued. They need a connection. Clearing the browser data deletes anything still marked saved on this device. The Sync screen says so.
