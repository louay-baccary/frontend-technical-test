import type { ReactElement } from 'react'
import { useRouter } from 'next/router'
import { useConversations } from '../../hooks/useConversations'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import { ConversationListItem } from './ConversationListItem'
import styles from './ConversationList.module.css'

export function ConversationList(): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const { currentUserId } = useCurrentUser()
  const { data: conversations, isLoading, isError, refetch } = useConversations()

  const selectedConversationId =
    typeof router.query.conversationId === 'string' ? router.query.conversationId : null

  const handleSelect = (conversationId: number) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, conversationId },
    })
  }

  // Same reasoning as MessageThread: a query that has ever succeeded keeps
  // its last-known-good data even after a later background refetch fails
  // (isError and cached data can both be true at once). Prefer showing
  // cached conversations over a blocking error screen; only fall back to
  // loading/error when there is nothing cached to show at all.
  if (conversations && conversations.length > 0) {
    return (
      <ul className={styles.list}>
        {conversations.map((conversation) => {
          const otherNickname =
            conversation.senderId === currentUserId
              ? conversation.recipientNickname
              : conversation.senderNickname

          return (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              otherNickname={otherNickname}
              isSelected={selectedConversationId === String(conversation.id)}
              onSelect={() => handleSelect(conversation.id)}
            />
          )
        })}
      </ul>
    )
  }

  if (isLoading) {
    return (
      <ul className={styles.list} aria-busy="true">
        {[0, 1, 2].map((key) => (
          <li key={key} className={styles.skeletonItem} aria-hidden="true" />
        ))}
      </ul>
    )
  }

  if (isError) {
    return (
      <div className={styles.errorState} role="alert">
        <p>{t('conversationList.errorTitle')}</p>
        <button type="button" className={styles.retryButton} onClick={() => refetch()}>
          {t('conversationList.retry')}
        </button>
      </div>
    )
  }

  return <p className={styles.emptyState}>{t('conversationList.empty')}</p>
}
