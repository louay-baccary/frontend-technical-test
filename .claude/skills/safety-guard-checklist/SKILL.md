---
name: safety-guard-checklist
description: Run before marking a feature ticket done — checks input validation, error paths, race conditions, and XSS-safe rendering
---

# safety-guard-checklist

Invoked at the end of a feature ticket (Tickets 5-10), before considering it complete.

## Checklist

1. **Input validation**: does every user-controllable input (message body, new-conversation recipient) get validated before use, not just at the UI layer but wherever it crosses into a request body?
2. **Error paths**: does every data-fetching hook actually handle the `ApiResult` failure branch, not just the happy path? Is there a visible error state, not a silent console.error?
3. **Race conditions**: for optimistic updates (Ticket 8) and cache merges (Ticket 9), what happens if the user triggers the action twice quickly, or navigates away mid-mutation? Is `cancelQueries` used where it should be?
4. **XSS-safe rendering**: does anything render message/user-supplied text via `dangerouslySetInnerHTML` or an unescaped `innerHTML`-equivalent? There should be zero instances.
5. Report which of the above were already handled by the implementation vs. anything that needed a follow-up fix, don't just say "checked, all good" without specifics.
