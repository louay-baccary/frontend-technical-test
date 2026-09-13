export interface FormattedTimestamp {
  relative: string
  absolute: string
}

export function formatTimestamp(input: string | number, locale: string = 'fr'): FormattedTimestamp {
  const raw = typeof input === 'string' ? Number(input) : input
  const ms = raw < 1e12 ? raw * 1000 : raw // db.json stores seconds, defend against ms anyway
  const date = new Date(ms)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  let relative: string
  if (diffMin < 1) relative = rtf.format(0, 'minute')
  else if (diffMin < 60) relative = rtf.format(-diffMin, 'minute')
  else if (diffMin < 60 * 24) relative = rtf.format(-Math.round(diffMin / 60), 'hour')
  else relative = date.toLocaleDateString(locale)

  return { relative, absolute: date.toLocaleString(locale) }
}
