import type { ReactElement, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { useTranslations } from '../../i18n/useTranslations'
import { UserSwitcher } from './UserSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'
import styles from './AppShell.module.css'

interface AppShellProps {
  conversationList: ReactNode
  messageThread: ReactNode
}

export function useSelectedConversationId(): string | null {
  const router = useRouter()
  const { conversationId } = router.query
  return typeof conversationId === 'string' ? conversationId : null
}

export function AppShell({ conversationList, messageThread }: AppShellProps): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const selectedConversationId = useSelectedConversationId()

  const handleBack = () => {
    const { conversationId, ...rest } = router.query
    router.push({ pathname: router.pathname, query: rest })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('appShell.title')}</h1>
        <div className={styles.headerControls}>
          <UserSwitcher />
          <LanguageSwitcher />
        </div>
      </header>

      <div className={styles.body} data-has-selection={selectedConversationId ? 'true' : 'false'}>
        <nav className={styles.listPane} aria-label={t('appShell.conversationsNav')}>
          {conversationList}
        </nav>

        <main className={styles.threadPane}>
          {selectedConversationId ? (
            <>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
                aria-label={t('appShell.back')}
              >
                {t('appShell.back')}
              </button>
              {messageThread}
            </>
          ) : (
            <p className={styles.noSelection}>{t('appShell.selectConversation')}</p>
          )}
        </main>
      </div>
    </div>
  )
}
