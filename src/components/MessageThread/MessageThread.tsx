import type { ReactElement } from 'react'
import { useRouter } from 'next/router'
import { useSelectedConversationId } from '../Layout/AppShell'
import { useMessages } from '../../hooks/useMessages'
import { useUsers } from '../../hooks/useUsers'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import { groupMessagesByDate, dateKeyFor } from '../../utils/groupMessagesByDate'
import { MessageBubble } from './MessageBubble'
import styles from './MessageThread.module.css'

export function MessageThread(): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const locale = router.locale ?? 'fr'
  const conversationIdStr = useSelectedConversationId()
  const conversationId = conversationIdStr ? Number(conversationIdStr) : null

  const { data: messages, isLoading, isError, refetch } = useMessages(conversationId)
  const { data: users } = useUsers()
  const { currentUserId } = useCurrentUser()

  // A query that has ever succeeded keeps its last-known-good `data` even
  // after a later background refetch fails (e.g. invalidateQueries after a
  // send attempt while offline) - `isError` and cached `data` can both be
  // true at once. Prefer showing that cached data over a blocking error
  // screen: only fall back to loading/error when there is nothing cached
  // to show at all.
  if (messages && messages.length > 0) {
    const groups = groupMessagesByDate(messages)
    const todayKey = dateKeyFor(Date.now())
    const yesterdayKey = dateKeyFor(Date.now() - 24 * 60 * 60 * 1000)

    return (
      <div className={styles.thread}>
        {groups.map((group) => {
          const firstMessageMs =
            group.messages[0].timestamp < 1e12
              ? group.messages[0].timestamp * 1000
              : group.messages[0].timestamp

          const label =
            group.dateKey === todayKey
              ? t('messageThread.today')
              : group.dateKey === yesterdayKey
                ? t('messageThread.yesterday')
                : new Date(firstMessageMs).toLocaleDateString(locale)

          return (
            <section key={group.dateKey} aria-label={label}>
              <h2 className={styles.dateHeading}>{label}</h2>
              <ul className={styles.messageList}>
                {group.messages.map((message) => {
                  const isOwn = message.authorId === currentUserId
                  const author = users?.find((user) => user.id === message.authorId)
                  const authorLabel = isOwn
                    ? t('messageThread.messageFromYou')
                    : t('messageThread.messageFromOther').replace('{name}', author?.nickname ?? '')

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      authorLabel={authorLabel}
                      locale={locale}
                    />
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.thread} aria-busy="true">
        {[0, 1, 2].map((key) => (
          <div key={key} className={styles.skeletonBubble} aria-hidden="true" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={styles.errorState} role="alert">
        <p>{t('messageThread.errorTitle')}</p>
        <button type="button" className={styles.retryButton} onClick={() => refetch()}>
          {t('messageThread.retry')}
        </button>
      </div>
    )
  }

  return <p className={styles.emptyState}>{t('messageThread.empty')}</p>
}
