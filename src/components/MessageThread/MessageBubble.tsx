import type { ReactElement } from 'react'
import type { Message } from '../../types/message'
import { formatTimestamp } from '../../utils/formatTimestamp'
import styles from './MessageThread.module.css'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  authorLabel: string
  locale: string
}

export function MessageBubble({ message, isOwn, authorLabel, locale }: MessageBubbleProps): ReactElement {
  const { relative, absolute } = formatTimestamp(message.timestamp, locale)

  return (
    <li className={isOwn ? styles.ownItem : styles.otherItem}>
      <div className={styles.bubble} aria-label={authorLabel}>
        {/* message.body is rendered as plain text only, React escapes it by
            default - never dangerouslySetInnerHTML here. */}
        <p className={styles.body}>{message.body}</p>
        <time className={styles.timestamp} title={absolute}>
          {relative}
        </time>
      </div>
    </li>
  )
}
