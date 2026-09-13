import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import { useTranslations } from '../../i18n/useTranslations'
import { UserSwitcher } from './UserSwitcher'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
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
  const backButtonRef = useRef<HTMLButtonElement>(null)
  const listPaneRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  // On mobile, selecting/deselecting a conversation hides the pane the
  // currently-focused element lives in via CSS display:none - the browser
  // then drops focus to <body>, so the next Tab press restarts from the top
  // of the page instead of continuing in the newly-revealed pane. Moving
  // focus explicitly keeps the tab order sensible across that transition.
  // On desktop both panes stay visible/display:none never applies, so
  // .focus() on the (still hidden-by-CSS) back button is a harmless no-op.
  // Skipped on the very first render so a fresh page load (including a
  // direct deep link into a conversation) doesn't have its initial focus
  // hijacked away from wherever the browser naturally placed it.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (selectedConversationId) {
      backButtonRef.current?.focus()
    } else {
      listPaneRef.current?.focus()
    }
  }, [selectedConversationId])

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
          <ThemeToggle />
        </div>
      </header>

      <main className={styles.body} data-has-selection={selectedConversationId ? 'true' : 'false'}>
        <nav
          ref={listPaneRef}
          className={styles.listPane}
          aria-label={t('appShell.conversationsNav')}
          tabIndex={-1}
        >
          {conversationList}
        </nav>

        <div className={styles.threadPane}>
          {selectedConversationId ? (
            <>
              <button
                ref={backButtonRef}
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
        </div>
      </main>
    </div>
  )
}
