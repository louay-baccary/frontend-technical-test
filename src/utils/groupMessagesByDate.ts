import type { Message } from '../types/message'

export interface MessageGroup {
  dateKey: string
  messages: Message[]
}

function toMs(timestamp: number): number {
  return timestamp < 1e12 ? timestamp * 1000 : timestamp
}

// Local-calendar-day key (not toISOString, which is UTC and would misgroup
// messages sent late at night in timezones behind/ahead of UTC).
export function dateKeyFor(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups = new Map<string, Message[]>()

  for (const message of messages) {
    const key = dateKeyFor(toMs(message.timestamp))
    const existing = groups.get(key)
    if (existing) {
      existing.push(message)
    } else {
      groups.set(key, [message])
    }
  }

  return Array.from(groups.entries())
    .map(([dateKey, groupMessages]) => ({ dateKey, messages: groupMessages }))
    .sort((a, b) => toMs(a.messages[0].timestamp) - toMs(b.messages[0].timestamp))
}
