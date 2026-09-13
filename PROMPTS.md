# Prompts Log

Running log of the prompts used with Claude Code during this test, kept honestly as we go (per the agentic-workflow evidence the client asked to see). Each entry: what was asked, why, and what came out of it.

---

## 2026-09-13 — Ticket 0: Claude Code artifacts + repo scaffolding

**Prompt (paraphrased)**: Implement Ticket 0 — set up `.claude/settings.json` with a `PreToolUse` hook that gates `git commit` on `npm run lint && npm test`, add the two skill files (`safety-guard-checklist`, `spec-clarifier`), start this file, create `CurrentUserContext` wrapping `getLoggedUserId()` without touching it, and add the minimal i18n layer (`fr.json`/`en.json`/`useTranslations.ts`) plus the one-line `next.config.js` locale change.

**Why**: this is the foundation ticket. Every later ticket with UI copy calls `useTranslations()` instead of hardcoding French strings, and the current-user context is reused by the user switcher and every hook that needs "who am I" (`useConversations`, `useSendMessage`, `useCreateConversation`). Doing this first avoids retrofitting i18n or a user context into components built without them.

**What came out of it**: an earlier planning pass (see `IMPLEMENTATION_PLAN.md` Section 9) had drafted the hook config against an invented `PreCommit` event with a `blocking` field — neither exists in the real Claude Code hooks schema. That was caught and corrected during planning, before any code was written: the real mechanism is `PreToolUse`, matched on the `Bash` tool, with an `if` condition on the command string, and the script signals block/allow via exit code (`2` = block, `0` = allow), not a config field. This ticket implements the corrected version.

**Verification**: hook tested by deliberately breaking a lint rule, attempting `git commit`, confirming the commit is blocked, then fixing the break and confirming the commit goes through (see verification steps at the end of this session's response). `fr.json`/`en.json` manually diffed key-by-key to confirm they match exactly.
