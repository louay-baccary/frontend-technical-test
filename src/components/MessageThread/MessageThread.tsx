import { useEffect, type ReactElement } from 'react'
import { useRouter } from 'next/router'
import { useSelectedConversationId } from '../Layout/AppShell'
import { useMessages } from '../../hooks/useMessages'
import { useUsers } from '../../hooks/useUsers'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import { useToast } from '../Feedback/ToastProvider'
import { groupMessagesByDate, dateKeyFor } from '../../utils/groupMessagesByDate'
import { MessageBubble } from './MessageBubble'
import { EmptyState } from '../Feedback/EmptyState'
import { ErrorState } from '../Feedback/ErrorState'
import { LoadingSkeleton } from '../Feedback/LoadingSkeleton'
import styles from './MessageThread.module.css'

export function MessageThread(): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const { showToast } = useToast()
  const locale = router.locale ?? 'fr'
  const conversationIdStr = useSelectedConversationId()
  const conversationId = conversationIdStr ? Number(conversationIdStr) : null

  const { data: messages, isLoading, isError, refetch } = useMessages(conversationId)
  const { data: users } = useUsers()
  const { currentUserId } = useCurrentUser()

  const hasCachedMessages = Boolean(messages && messages.length > 0)

  // A query that has ever succeeded keeps its last-known-good `data` even
  // after a later background refetch fails (e.g. invalidateQueries after a
  // send attempt while offline) - `isError` and cached `data` can both be
  // true at once. We prefer showing that cached data over a blocking error
  // screen (see below), which means this particular failure would otherwise
  // be completely silent - nothing on screen ever changes. A toast is the
  // right fit here specifically because there is no other visible error
  // state to redirect to; it would be redundant next to an inline error.
  useEffect(() => {
    if (isError && hasCachedMessages) {
      showToast(t('messageThread.errorTitle'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError])

  if (hasCachedMessages && messages) {
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
      <LoadingSkeleton
        containerTag="div"
        itemTag="div"
        containerClassName={styles.thread}
        itemClassName={styles.skeletonBubble}
      />
    )
  }

  if (isError) {
    return (
      <ErrorState
        message={t('messageThread.errorTitle')}
        retryLabel={t('messageThread.retry')}
        onRetry={() => refetch()}
        className={styles.errorState}
        retryClassName={styles.retryButton}
      />
    )
  }

  return <EmptyState message={t('messageThread.empty')} className={styles.emptyState} />
}
