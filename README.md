# leboncoin Messaging Interface

A messaging interface for leboncoin: a conversation list, a message thread, and the ability to send new messages and start new conversations, built on top of the provided Next.js scaffold and mock API.

Includes both bonuses (starting a new conversation, and graceful handling of a shaky/offline backend), plus accessibility, internationalization (French/English), and dark mode.

## Running it locally

You need two servers running side by side.

```bash
npm install

# Terminal 1: the mock API server (port 3005)
npm run start-server

# Terminal 2: the Next.js app (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app defaults to user "Thibaut" (user id 1); use the dropdown in the header to switch to another seeded user (Jeremie, Patrick, Elodie) to see the app from a different angle, or to test starting a new conversation (Thibaut is already in a conversation with everyone seeded, so nothing is left to start).

### Tests

```bash
npm test         # unit + integration tests (Jest + Testing Library)
npm run lint     # ESLint, including jsx-a11y accessibility rules
npm run test:e2e # optional: one Playwright smoke test against both real servers, see "Testing" below
```

## What was built

- Conversation list: loading skeleton, error state with retry, empty state, sorted by most recent activity, with a real last-message preview.
- Message thread: grouped by date ("Today" / "Yesterday" / date), own vs. other messages distinguished by alignment _and_ an accessible label (not color alone), message bodies always rendered as plain text (never as HTML, even if they contain something that looks like a script tag).
- Message composer: optimistic sending (a message appears immediately), with a visible failed/retry state and rollback if the send actually fails. Client-side validation (empty / over-length). Protected against double-submits, on both the send button and the retry button.
- **Bonus 1 - new conversation**: a modal listing eligible recipients (excludes yourself and anyone you're already talking to, checked in both directions - i.e. it also correctly excludes someone who started a conversation _with_ you, not just people you started one with). Keyboard-accessible: focus trap, Escape to close, focus returns to the button that opened it. Loaded lazily (`next/dynamic`), not part of the initial page bundle.
- **Bonus 2 - shaky infrastructure**: every data-fetching surface has a real loading skeleton and a real error+retry state, not a blank screen or a silent console error. A toast layer additionally surfaces failures that would otherwise be completely silent (see "Trade-offs" below).
- Internationalization: French (default) and English, a language switcher in the header, relative timestamps phrased correctly per locale (`Intl.RelativeTimeFormat`, e.g. "il y a 2 min" vs. "2 minutes ago").
- Dark mode: follows the OS-level preference automatically, with a manual toggle in the header that overrides it either direction and remembers your choice.
- Accessibility: landmark regions, keyboard-only navigation across the whole app (list → thread → composer, including the mobile back button), visible focus indicators, `aria-live` regions for validation errors and toasts, a real focus-management fix for the mobile list/thread pane transition (details below).

## Verified findings against the provided scaffold

Two real bugs were found by testing the provided middleware directly with `curl`, not assumed from reading the code.

### 1. `require()` caching bug in `src/server/middleware/conversations.js`

The middleware loaded `db.json` once, at server _boot_, via `require()`. Node caches `require()`, so this middleware kept serving a frozen snapshot from startup for the entire life of the process - a `POST /conversations/:id` would write correctly to disk, but a subsequent `GET /conversations/:id` (which goes through this middleware) would never reflect it, no restart required to reproduce, no restart possible to fix it short of literally restarting the process.

**Fix**: replaced the top-level `require()` with a `fs.readFileSync` + `JSON.parse` inside the request handler, so it re-reads the file from disk on every request.

### 2. The documented POST bodies are incomplete

- `POST /messages/{conversationId}` with just `{ body, timestamp }` (as the swagger documents) creates a message with **no `conversationId` and no `authorId`** - neither is inferred from the URL. The app adds both client-side.
- `POST /conversations/{userId}` needs `senderId`, `senderNickname`, and `recipientNickname` added on top of the documented `recipientId`, otherwise the created record exists but is unusable - wrong shape, invisible to the sender's own filtered list even before the caching bug above is factored in.

## Trade-offs worth knowing about

**Last-message preview is an N+1 fetch.** The `Conversation` object returned by the API has no message body, only a `lastMessageTimestamp`. To show a real preview in the list, the app fetches each visible conversation's messages (reusing the same query the thread view uses, so opening a conversation afterward is instant - no extra network request). At this test's scale (a handful of conversations) this is a reasonable, deliberate choice. At real scale, the backend should denormalize a `lastMessage` field directly onto the conversation object, so the list is a single request regardless of how many conversations exist.

**Toasts are reserved for genuinely silent failures, not duplicated on top of visible ones.** For example, a failed message send already shows an inline banner with a retry button - a toast on top of that would be redundant. But when the app is showing already-cached data (a conversation list or thread you'd already loaded) and a background refresh silently fails, that failure would otherwise never reach the user at all; a toast is the only signal for that specific case.

## Accessibility

`npm run lint` enforces `jsx-a11y` rules with zero warnings across the component tree (verified this is a real, active check - not silently passing because the rule set wasn't wired up - by deliberately introducing a violation and confirming it was caught, then removing it).

One cross-cutting bug found during a dedicated keyboard-only walkthrough, not caught by linting: on mobile widths, selecting or deselecting a conversation hides the pane the currently-focused button lives in via CSS (`display: none`), and browsers respond to that by dropping focus to `<body>` - so the very next `Tab` press restarted from the top of the page instead of continuing naturally into the newly-revealed pane. Fixed by explicitly moving focus to a sensible target (the back button, or the conversation list) on each transition.

**One real gap was found and fixed via an actual Lighthouse accessibility audit**, not by inspection: on the very first mobile-width page load, before any conversation is selected, the `<main>` landmark existed in the DOM but was `display: none` (there was nothing to show there yet on mobile - the list took the full screen), so Lighthouse correctly flagged "Document does not have a main landmark" for that state. Fixed by restructuring so `<main>` always wraps the whole list+thread area (never hidden), and only an inner `<div>` toggles per the mobile/desktop layout - the landmark itself is now always present, regardless of what's selected.

## Testing

`npm test` runs the full Jest + Testing Library suite (unit tests for pure utilities, integration tests for every component and hook, including ones that exercise the real API layer rather than a mock, to catch bugs that only show up in real integration - two were actually found this way, see the prompt log note below).

An optional Playwright smoke test (`npm run test:e2e`) opens a conversation, sends a message, and confirms it appears - a genuine end-to-end check against both real servers. This is a stretch addition, not part of the required suite; it starts both servers itself if they aren't already running.

## Performance

A real Lighthouse pass (performance + accessibility + SEO) was run against a production build (`npm run build && npm run start`), not the dev server - the dev server's numbers are meaningfully worse (unminified bundles, HMR overhead) and would have been a misleading thing to report.

**Internal result**: Performance **99/100**, Accessibility **100/100**, SEO **100/100**, all against the production build. Full report: [`docs/lighthouse/lighthouse-report.html`](./docs/lighthouse/lighthouse-report.html) (open it directly in a browser). This specific run used the Lighthouse CLI directly - `npx lighthouse http://localhost:3000 --output=html --output=json --chrome-flags="--headless=new --no-sandbox --disable-gpu" --only-categories=performance,accessibility,seo` - driving a fresh, extension-free headless Chromium instance in an isolated sandbox with no browser profile, no extensions, and no other tabs or background processes competing for CPU.

**Manually re-run against the same production build, in a real desktop browser (Chrome DevTools' Lighthouse panel), the score was meaningfully lower**: 82-86 in a private/incognito window, and 70 in a normal browser profile with everything else running as usual. That gap is real and worth naming plainly rather than only reporting the flattering number: browser extensions and a loaded real profile measurably drag Lighthouse's performance score down (each one adds its own script injection, DOM observers, or background work that competes with the page being measured), and a private window strips most but not all of that overhead. The CLI/headless number (99) reflects the app's own code with nothing else in the way; the 70-86 range reflects what an actual reviewer, opening this in their own everyday browser, would more realistically see. Both are genuine, reproducible measurements of the same unchanged build - the honest takeaway is the *range* (70-99 depending on what else is running in the browser), not a single cherry-picked number.

Worth also being honest about the first internal measurement, rather than just reporting the better one: the very first CLI run scored Performance 76/100 (before the fix below), with a Total Blocking Time of 760ms. Re-running the *exact same, unchanged* build a few minutes later scored 99/100 with a TBT of 90-100ms - confirmed via Lighthouse's own `benchmarkIndex` diagnostic (which nearly doubled between the two runs) that this was CPU-load noise in the sandbox between runs, not a real before/after effect of the accessibility fix.

## Out of scope, and what production at scale would actually need

Each of these was deliberately not built, with the reasoning for why:

- **PWA (installability + offline support)**: a web manifest and basic asset caching would have been cheap. Real offline support for _sending_ messages needs a sync/outbox queue and conflict resolution - a meaningfully bigger feature that would have traded directly against the robustness work the brief calls out in bold.
- **Real-time updates (WebSockets/SSE)**: the app currently relies on query invalidation and manual refetch/retry, not a live push channel. At real scale, a new message from the other party wouldn't show up without a manual refresh - production would need a WebSocket or SSE channel (or at minimum, polling) to push new messages/conversations to an open client.
- **SonarCloud / static analysis in CI**: ESLint (including accessibility rules) runs in CI already; a dedicated code-quality gate like SonarCloud is a reasonable next step for a real team, not something this exercise's scope justified setting up.
- **Server-side pagination on `GET /messages/{conversationId}`**: the app currently fetches a conversation's entire message history in one request. Fine for a handful of seeded messages; at real scale, a long-running conversation would need cursor-based pagination, loading older messages on demand (e.g. on scroll-up) rather than all at once.
- **CDN / edge caching for read-heavy endpoints**: `GET /users` (a small, rarely-changing list) is refetched per client with no caching layer beyond the app's own query cache. At scale, an endpoint like that is a natural candidate for CDN or edge caching, since it's the same data for every user and changes rarely.
- **Rate-limiting and idempotency keys on `POST /messages/{conversationId}`**: nothing currently stops a client (buggy or malicious) from flooding the send endpoint, and a retried request after a timeout has no idempotency key to deduplicate against on the server side if it actually went through the first time. Both are standard production concerns for a public write endpoint that this exercise's scope didn't call for.

## Demo video

**[Watch the demo](https://jam.dev/c/561a9a06-005a-4eb2-8075-2d966e31893b)** - recorded with [Jam](https://jam.dev/), showing the app working at both desktop and mobile widths.

## Honest time spent

Roughly **5.5-6 hours** end to end, including initial planning, all required tickets, both bonuses, and this README - noticeably over the brief's ~4 hour guide. This was a deliberate choice, not an oversight: this is a strong lead worth doing properly rather than rushing to hit the guide exactly, and the brief itself explicitly asks for an honest number rather than a flattering one.

A large share of that time went to verification, not generation - manually testing against the real mock server (including deliberately killing it mid-request to check failure states), a real keyboard-only accessibility walkthrough, checking contrast ratios with the actual WCAG formula rather than trusting generated CSS by eye, and chasing down a couple of bugs that only showed up when actually clicking through the app rather than reading the code (see the note on the prompt log below).

A running prompt log was kept in real time throughout development - each ticket's prompt, what was found, and what was verified, including a couple of real bugs whose root cause took real back-and-forth to actually track down (one where "the send button hangs forever offline" turned out to be a data-fetching library silently pausing requests rather than a timeout bug, only found by testing against a real offline network condition, not by reasoning about the code). It's intentionally not part of this repository (excluded via `.gitignore`, matching the brief's own "up to you how to work" framing) but is available on request.

## Workflow

The work was broken into 14 small tickets up front (scaffolding first, then the middleware fix, then design tokens, then the API layer, then each feature roughly in dependency order, then the cross-cutting passes - accessibility, test gaps, dark mode - last). Each ticket got its own branch off `main` and its own pull request, reviewed and merged one at a time before starting the next, rather than one large branch for the whole exercise. A few tickets also picked up a genuine bug found while manually testing the _previous_ ticket's work (e.g. a composer draft leaking across conversations, the send button hanging forever with no network) - those got fixed and merged as part of the ticket where they were found, with the reasoning kept in the prompt log rather than silently folded in.

---

> **The rest of this file below is the original exercise brief, exactly as provided - kept verbatim for reference, not written as part of this submission.**

# Original brief (as provided)

## Context

At leboncoin, our users can share messages about a transaction, or ask for informations about any products.

Your job is to create the interface to consult those messages.
The interface needs to work on both desktop & mobile devices.

In addition to your code, a README explaining your thought process and your choices would be appreciated.

## Exercise

- Display a list of all the conversations
- Allow the user to select a conversation
  - Inside the conversation, there is a list of all the messages between these two users.
  - As a user, you can type and send new messages in this conversation

**As your application can be used by millions of users, make sure to provide some robust safety guards.**

### Sketches

Obvisouly, it is up to you to make something nice and pretty, you are free to design it the way you like. The sketches are here to give you an idea on how it should look.

<details>
  <summary>Click to see the sketches</summary>

Mobile list :

![](./sketches/list-mobile.jpg)

Desktop list :

![](./sketches/list-desktop.jpg)

Mobile conversation :

![](./sketches/conv-mobile.jpg)

Desktop conversation :

![](./sketches/conv-desktop.jpg)

</details>

### API

You can find the API swagger file in `docs/api-swagger.yaml`.

For a better readibility, you can view it on [https://leboncoin.tech/frontend-technical-test/](https://leboncoin.tech/frontend-technical-test/).

---

## Bonus 1

We provide some conversation samples, but can you improve the app so the user can now create new conversations ?

## Bonus 2

Our infrastructure is a bit shaky.. Sometimes the servers are crashing. "It's not you, it's me", but maybe you can display something nice to warn the user and handle it gracefully.

## Do you want to make the app even better ?

Feel free to make as many improvements as you like.
We love creativity and technical challenges.

If you are out of ideas, here are some thoughts :

- As we want to reach our users anywhere, we need to make sure the app is performing well. What can you do to make it really fast ?

- Our goal is to support everybody in the country, including people with disabilities. As a good citizen and a good developer, can you make sure the app is accessible for everyone ?

- We all love to relax after a hard day's work. It would be a shame if we didn't feel confident enough about the upcoming automatic deployment. Are you sure everything has been tested thoroughly ?
