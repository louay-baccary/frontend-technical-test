import type { ReactElement } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslations } from '../../i18n/useTranslations'
import styles from './AppShell.module.css'

export function LanguageSwitcher(): ReactElement {
  const router = useRouter()
  const t = useTranslations()

  return (
    <div className={styles.languageSwitcher} role="group" aria-label={t('appShell.languageNav')}>
      <Link
        href={router.asPath}
        locale="fr"
        aria-label={t('appShell.switchToFrench')}
        aria-current={router.locale === 'fr' ? 'true' : undefined}
      >
        FR
      </Link>
      <Link
        href={router.asPath}
        locale="en"
        aria-label={t('appShell.switchToEnglish')}
        aria-current={router.locale === 'en' ? 'true' : undefined}
      >
        EN
      </Link>
    </div>
  )
}
