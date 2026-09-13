import { useRouter } from 'next/router'
import fr from './messages/fr.json'
import en from './messages/en.json'

const messages = { fr, en } as const
type Locale = keyof typeof messages
const unused = 1;
function getNested(obj: unknown, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj) as string | undefined
}

export function useTranslations() {
  const { locale } = useRouter()
  const dict = messages[(locale as Locale) ?? 'fr'] ?? messages.fr

  return (key: string) => getNested(dict, key) ?? key
}
