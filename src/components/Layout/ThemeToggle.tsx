import type { ReactElement } from 'react'
import { useTranslations } from '../../i18n/useTranslations'
import { useTheme } from '../../hooks/useTheme'
import styles from './AppShell.module.css'

export function ThemeToggle(): ReactElement {
  const t = useTranslations()
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={isDark ? t('appShell.switchToLight') : t('appShell.switchToDark')}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
