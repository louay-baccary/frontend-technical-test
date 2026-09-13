---
name: spec-clarifier
description: Before implementing a ticket, check the acceptance criteria against the actual current repo state and surface real ambiguity instead of silently guessing
---

# spec-clarifier

Invoked at the start of every ticket, before writing any code.

## What to do

1. Read the ticket's "Files touched" and "Acceptance criteria" in `TICKETS.md`, and the matching section of `IMPLEMENTATION_PLAN.md`.
2. Compare against the actual current state of the repo, not the plan's assumptions: has a dependency ticket done something slightly different than planned? Does a referenced type/hook/file already look different from what the plan describes?
3. If everything genuinely lines up, say so explicitly ("no ambiguity found, proceeding as planned") and start implementing immediately. Do not manufacture a question just to seem thorough, that defeats the point and wastes time on a real time budget.
4. If something is genuinely underspecified or conflicts with what's actually in the repo, ask one specific, answerable question before writing code, rather than picking an interpretation silently.
5. Bias toward asking about things with real consequences (data shape, error-handling behavior, accessibility semantics, anything that would be expensive to redo) over cosmetic wording choices, those aren't worth a question.
