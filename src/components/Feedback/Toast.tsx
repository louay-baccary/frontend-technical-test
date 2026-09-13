import { useEffect, useRef, type ReactElement } from 'react'
import { useTranslations } from '../../i18n/useTranslations'
import styles from './Feedback.module.css'

const AUTO_DISMISS_MS = 5000

interface ToastProps {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps): ReactElement {
  const t = useTranslations()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timerRef.current)
  }, [onDismiss])

  // Perceived-time guard: a screen-reader/keyboard user who tabs onto the
  // toast (or is reading it) shouldn't have it vanish out from under them -
  // pause the auto-dismiss timer while focused, resume it on blur.
  const handleFocus = () => clearTimeout(timerRef.current)
  const handleBlur = () => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS)
  }

  return (
    <div
      className={styles.toast}
      role="status"
      aria-live="polite"
      tabIndex={0}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <span>{message}</span>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={onDismiss}
        aria-label={t('common.dismiss')}
      >
        &times;
      </button>
    </div>
  )
}
