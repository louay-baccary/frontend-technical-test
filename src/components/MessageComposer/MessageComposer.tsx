import { useRef, useState, type FormEvent, type ReactElement } from 'react'
import { useSelectedConversationId } from '../Layout/AppShell'
import { useSendMessage } from '../../hooks/useSendMessage'
import { validateMessageBody } from '../../utils/validateMessageBody'
import { useTranslations } from '../../i18n/useTranslations'
import type { ApiResult } from '../../types/api'
import styles from './MessageComposer.module.css'

interface FailedSend {
  id: string
  body: string
  message: string
}

function isApiError(error: unknown): error is Extract<ApiResult<unknown>, { ok: false }> {
  return typeof error === 'object' && error !== null && (error as { ok?: unknown }).ok === false
}

export function MessageComposer(): ReactElement | null {
  const t = useTranslations()
  const conversationIdStr = useSelectedConversationId()
  const conversationId = conversationIdStr ? Number(conversationIdStr) : null

  const [text, setText] = useState('')
  const [validationErrorKey, setValidationErrorKey] = useState<string | null>(null)
  const [failedSends, setFailedSends] = useState<FailedSend[]>([])
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const retryingIdRef = useRef<string | null>(null)

  const sendMessage = useSendMessage(conversationId ?? 0)

  if (conversationId === null) {
    return null
  }

  const attemptSend = (body: string, failedId?: string) => {
    sendMessage.mutate(body, {
      onSuccess: () => {
        if (failedId) {
          setFailedSends((current) => current.filter((failed) => failed.id !== failedId))
        }
      },
      onError: (error) => {
        const message = isApiError(error) ? error.message : t('composer.failed')
        if (failedId) {
          setFailedSends((current) =>
            current.map((failed) => (failed.id === failedId ? { ...failed, message } : failed))
          )
        } else {
          setFailedSends((current) => [
            ...current,
            { id: `${Date.now()}-${Math.random()}`, body, message },
          ])
        }
      },
      onSettled: () => {
        if (failedId) {
          retryingIdRef.current = null
          setRetryingId(null)
        }
      },
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (sendMessage.isPending) {
      return
    }

    const result = validateMessageBody(text)
    if (!result.valid) {
      setValidationErrorKey(result.error === 'empty' ? 'composer.emptyError' : 'composer.tooLongError')
      return
    }

    setValidationErrorKey(null)
    const body = text.trim()
    setText('')
    attemptSend(body)
  }

  const handleRetry = (failed: FailedSend) => {
    // Ref guard, not just the disabled attribute: two fast clicks can both
    // fire before React re-renders, so a state-only check could still race.
    if (retryingIdRef.current) {
      return
    }
    retryingIdRef.current = failed.id
    setRetryingId(failed.id)
    attemptSend(failed.body, failed.id)
  }

  const isSending = sendMessage.isPending

  return (
    <div className={styles.wrapper}>
      {failedSends.map((failed) => (
        <div key={failed.id} className={styles.failedBanner} role="alert">
          <span className={styles.failedText}>
            {t('composer.failed')}: {failed.body} ({failed.message})
          </span>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => handleRetry(failed)}
            disabled={retryingId === failed.id}
            aria-busy={retryingId === failed.id}
          >
            {t('composer.retry')}
          </button>
        </div>
      ))}

      <form className={styles.form} onSubmit={handleSubmit} aria-busy={isSending}>
        <label className={styles.srOnly} htmlFor="message-composer-input">
          {t('composer.placeholder')}
        </label>
        <input
          id="message-composer-input"
          type="text"
          className={styles.input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('composer.placeholder')}
          disabled={isSending}
          aria-describedby="message-composer-error"
          aria-invalid={validationErrorKey ? true : undefined}
        />
        <button type="submit" className={styles.sendButton} disabled={isSending}>
          {isSending ? t('composer.sending') : t('composer.send')}
        </button>
      </form>

      <p id="message-composer-error" className={styles.errorText} role="alert" aria-live="polite">
        {validationErrorKey ? t(validationErrorKey) : ''}
      </p>
    </div>
  )
}
