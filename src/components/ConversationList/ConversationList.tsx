import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { useConversations } from '../../hooks/useConversations'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import { useToast } from '../Feedback/ToastProvider'
import { ConversationListItem } from './ConversationListItem'
import { EmptyState } from '../Feedback/EmptyState'
import { ErrorState } from '../Feedback/ErrorState'
import { LoadingSkeleton } from '../Feedback/LoadingSkeleton'
import styles from './ConversationList.module.css'

// Not imported eagerly: most page loads never open this modal, so its code
// shouldn't sit in the initial bundle.
const NewConversationModal = dynamic(() => import('../NewConversationModal/NewConversationModal'), {
  ssr: false,
})

export function ConversationList(): ReactElement {
  const router = useRouter()
  const t = useTranslations()
  const { showToast } = useToast()
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

  const hasCachedConversations = Boolean(conversations && conversations.length > 0)

  // Same reasoning as MessageThread: a query that has ever succeeded keeps
  // its last-known-good data even after a later background refetch fails
  // (isError and cached data can both be true at once). We prefer cached
  // conversations over a blocking error screen (see below), which would
  // otherwise leave this failure completely silent - a toast is the right
  // fit only because there is no other visible error state to redirect to.
  useEffect(() => {
    if (isError && hasCachedConversations) {
      showToast(t('conversationList.errorTitle'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError])

  let body: ReactNode

  if (hasCachedConversations && conversations) {
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
      <LoadingSkeleton
        containerTag="ul"
        itemTag="li"
        containerClassName={styles.list}
        itemClassName={styles.skeletonItem}
      />
    )
  } else if (isError) {
    body = (
      <ErrorState
        message={t('conversationList.errorTitle')}
        retryLabel={t('conversationList.retry')}
        onRetry={() => refetch()}
        className={styles.errorState}
        retryClassName={styles.retryButton}
      />
    )
  } else {
    body = <EmptyState message={t('conversationList.empty')} className={styles.emptyState} />
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
