import { useState, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useConversations } from '../../hooks/useConversations'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import { ConversationListItem } from './ConversationListItem'
import styles from './ConversationList.module.css'

// Not imported eagerly: most page loads never open this modal, so its code
// shouldn't sit in the initial bundle.
const NewConversationModal = dynamic(() => import('../NewConversationModal/NewConversationModal'), {
  ssr: false,
})

export function ConversationList(): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const { currentUserId } = useCurrentUser()
  const { data: conversations, isLoading, isError, refetch } = useConversations()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const selectedConversationId =
    typeof router.query.conversationId === 'string' ? router.query.conversationId : null

  const handleSelect = (conversationId: number) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, conversationId },
    })
  }

  let body: ReactNode

  // Same reasoning as MessageThread: a query that has ever succeeded keeps
  // its last-known-good data even after a later background refetch fails
  // (isError and cached data can both be true at once). Prefer showing
  // cached conversations over a blocking error screen; only fall back to
  // loading/error when there is nothing cached to show at all.
  if (conversations && conversations.length > 0) {
    body = (
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
  } else if (isLoading) {
    body = (
      <ul className={styles.list} aria-busy="true">
        {[0, 1, 2].map((key) => (
          <li key={key} className={styles.skeletonItem} aria-hidden="true" />
        ))}
      </ul>
    )
  } else if (isError) {
    body = (
      <div className={styles.errorState} role="alert">
        <p>{t('conversationList.errorTitle')}</p>
        <button type="button" className={styles.retryButton} onClick={() => refetch()}>
          {t('conversationList.retry')}
        </button>
      </div>
    )
  } else {
    body = <p className={styles.emptyState}>{t('conversationList.empty')}</p>
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <button type="button" className={styles.newConversationButton} onClick={() => setIsModalOpen(true)}>
          {t('newConversation.title')}
        </button>
      </div>

      {body}

      {isModalOpen && <NewConversationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  )
}
