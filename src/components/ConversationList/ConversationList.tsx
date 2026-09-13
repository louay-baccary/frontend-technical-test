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

  if (!conversations || conversations.length === 0) {
    return <p className={styles.emptyState}>{t('conversationList.empty')}</p>
  }

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
