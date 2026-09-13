import type { ReactElement } from 'react'
import { useTranslations } from '../../i18n/useTranslations'
import type { ConversationWithPreview } from '../../hooks/useConversations'
import styles from './ConversationList.module.css'

interface ConversationListItemProps {
  conversation: ConversationWithPreview
  otherNickname: string
  isSelected: boolean
  onSelect: () => void
}

export function ConversationListItem({
  conversation,
  otherNickname,
  isSelected,
  onSelect,
}: ConversationListItemProps): ReactElement {
  const t = useTranslations()

  // db.json's lastMessageTimestamp is in seconds; defend against ms anyway.
  const ms =
    conversation.lastMessageTimestamp < 1e12
      ? conversation.lastMessageTimestamp * 1000
      : conversation.lastMessageTimestamp
  const dateLabel = new Date(ms).toLocaleDateString()

  const previewText = conversation.previewText ?? t('conversationList.noMessagesPreview')

  return (
    <li className={styles.item} aria-current={isSelected ? 'true' : undefined}>
      <button type="button" className={styles.itemButton} onClick={onSelect}>
        <span className={styles.itemHeader}>
          <span className={styles.nickname}>{otherNickname}</span>
          <span className={styles.timestamp}>{dateLabel}</span>
        </span>
        <span className={styles.preview}>{previewText}</span>
      </button>
    </li>
  )
}
