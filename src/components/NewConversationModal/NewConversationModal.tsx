import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { useRouter } from 'next/router'
import { useUsers } from '../../hooks/useUsers'
import { useConversations } from '../../hooks/useConversations'
import { useCreateConversation } from '../../hooks/useCreateConversation'
import { useCurrentUser } from '../../context/CurrentUserContext'
import { useTranslations } from '../../i18n/useTranslations'
import type { ApiResult } from '../../types/api'
import styles from './NewConversationModal.module.css'

function isApiError(error: unknown): error is Extract<ApiResult<unknown>, { ok: false }> {
  return typeof error === 'object' && error !== null && (error as { ok?: unknown }).ok === false
}

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

interface NewConversationModalProps {
  onClose: () => void
}

export default function NewConversationModal({ onClose }: NewConversationModalProps): ReactElement {
  const t = useTranslations()
  const router = useRouter()
  const { currentUserId } = useCurrentUser()
  const { data: users } = useUsers()
  const { data: conversations } = useConversations()
  const createConversation = useCreateConversation()

  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedElement = useRef<HTMLElement | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Focus trap + initial focus + return focus to the trigger on close.
  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null

    const dialogEl = dialogRef.current
    const focusable = dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    focusable?.[0]?.focus()

    return () => {
      previouslyFocusedElement.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const currentUserNickname = users?.find((user) => user.id === currentUserId)?.nickname ?? ''

  // Excluded in both directions: a conversation where the current user is
  // either the sender or the recipient counts as "existing" with that
  // other party, e.g. seeded conversation 3 (senderId 4, recipientId 1)
  // must exclude user 4 for current user 1.
  const existingRecipientIds = new Set(
    (conversations ?? []).flatMap((conversation) => {
      if (conversation.senderId === currentUserId) return [conversation.recipientId]
      if (conversation.recipientId === currentUserId) return [conversation.senderId]
      return []
    })
  )

  const eligibleUsers = (users ?? []).filter(
    (user) => user.id !== currentUserId && !existingRecipientIds.has(user.id)
  )

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (selectedUserId === '' || createConversation.isPending) {
      return
    }

    const recipient = eligibleUsers.find((user) => user.id === selectedUserId)
    if (!recipient) {
      return
    }

    setErrorMessage(null)

    createConversation.mutate(
      {
        recipientId: recipient.id,
        recipientNickname: recipient.nickname,
        senderNickname: currentUserNickname,
      },
      {
        onSuccess: (created) => {
          router.push({
            pathname: router.pathname,
            query: { ...router.query, conversationId: created.id },
          })
          onClose()
        },
        onError: (error) => {
          setErrorMessage(isApiError(error) ? error.message : t('newConversation.createError'))
        },
      }
    )
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-conversation-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="new-conversation-title" className={styles.title}>
          {t('newConversation.title')}
        </h2>

        <form onSubmit={handleSubmit} aria-busy={createConversation.isPending}>
          <label htmlFor="new-conversation-recipient" className={styles.label}>
            {t('newConversation.selectRecipient')}
          </label>
          <select
            id="new-conversation-recipient"
            className={styles.select}
            value={selectedUserId}
            disabled={createConversation.isPending}
            onChange={(event) =>
              setSelectedUserId(event.target.value ? Number(event.target.value) : '')
            }
          >
            <option value="" disabled>
              {t('newConversation.selectRecipient')}
            </option>
            {eligibleUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.nickname}
              </option>
            ))}
          </select>

          {errorMessage && (
            <p className={styles.errorText} role="alert" aria-live="polite">
              {t('newConversation.createError')}: {errorMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              {t('newConversation.cancel')}
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={selectedUserId === '' || createConversation.isPending}
            >
              {createConversation.isPending ? t('newConversation.creating') : t('newConversation.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
