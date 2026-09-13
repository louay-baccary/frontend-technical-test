import { formatTimestamp } from '../formatTimestamp'

describe('formatTimestamp', () => {
  const NOW = new Date('2024-01-15T12:00:00.000Z').getTime()

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('treats a value under 1e12 as seconds', () => {
    const seconds = Math.floor((NOW - 2 * 60000) / 1000)
    const result = formatTimestamp(seconds, 'en')
    expect(result.relative).toBe('2 minutes ago')
  })

  it('treats a value at or above 1e12 as milliseconds', () => {
    const ms = NOW - 2 * 60000
    const result = formatTimestamp(ms, 'en')
    expect(result.relative).toBe('2 minutes ago')
  })

  it('accepts a numeric string input', () => {
    const ms = NOW - 5 * 60000
    const result = formatTimestamp(String(ms), 'en')
    expect(result.relative).toBe('5 minutes ago')
  })

  it('renders a "this minute" phrasing for the current minute, not "0 minutes ago"', () => {
    const result = formatTimestamp(NOW, 'en')
    expect(result.relative).not.toMatch(/^0 minutes/)
    expect(result.relative).toBe(new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(0, 'minute'))
  })

  it('renders minutes-ago phrasing under an hour', () => {
    const result = formatTimestamp(NOW - 30 * 60000, 'en')
    expect(result.relative).toBe('30 minutes ago')
  })

  it('renders hours-ago phrasing under a day', () => {
    const result = formatTimestamp(NOW - 5 * 60 * 60000, 'en')
    expect(result.relative).toBe('5 hours ago')
  })

  it('falls back to an absolute date beyond a day', () => {
    const twoDaysAgo = NOW - 2 * 24 * 60 * 60000
    const result = formatTimestamp(twoDaysAgo, 'en')
    expect(result.relative).toBe(new Date(twoDaysAgo).toLocaleDateString('en'))
  })

  it('phrases the same timestamp differently in fr vs en', () => {
    const tenMinutesAgo = NOW - 10 * 60000
    const fr = formatTimestamp(tenMinutesAgo, 'fr')
    const en = formatTimestamp(tenMinutesAgo, 'en')

    expect(en.relative).toBe('10 minutes ago')
    expect(fr.relative).toBe('il y a 10 minutes')
    expect(fr.relative).not.toBe(en.relative)
  })
})
