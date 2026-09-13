import type { ReactElement } from 'react'

interface ErrorStateProps {
  message: string
  retryLabel: string
  onRetry: () => void
  className?: string
  retryClassName?: string
}

export function ErrorState({
  message,
  retryLabel,
  onRetry,
  className,
  retryClassName,
}: ErrorStateProps): ReactElement {
  return (
    <div className={className} role="alert">
      <p>{message}</p>
      <button type="button" className={retryClassName} onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  )
}
