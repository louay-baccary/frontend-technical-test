import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Optional/stretch (see README) - one end-to-end smoke test against the
// real mock server and dev server, not part of the required suite
// (npm test / Jest already covers behavior with mocks). Run with:
// npm run test:e2e

const DB_PATH = path.join(__dirname, '../src/server/db.json')
let dbSnapshot: string

test.beforeEach(() => {
  dbSnapshot = fs.readFileSync(DB_PATH, 'utf-8')
})

test.afterEach(() => {
  // Sending a message during the test really persists to db.json via the
  // mock server - restore the seed data so repeated runs stay deterministic.
  fs.writeFileSync(DB_PATH, dbSnapshot)
})

test('open a conversation, send a message, see it appear', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Jeremie' }).click()

  const messageText = `Smoke test message ${Date.now()}`
  const input = page.getByPlaceholder('Écrivez un message...')
  await input.fill(messageText)
  await page.getByRole('button', { name: 'Envoyer' }).click()

  // The message legitimately shows up in two places (the thread, and the
  // conversation list's last-message preview) - scope to the thread region
  // specifically to avoid strict-mode ambiguity.
  await expect(page.getByRole('main').getByText(messageText)).toBeVisible()
})
