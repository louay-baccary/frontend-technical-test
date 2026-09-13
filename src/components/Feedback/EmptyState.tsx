import type { ReactElement } from 'react'

interface EmptyStateProps {
  message: string
  className?: string
}

export function EmptyState({ message, className }: EmptyStateProps): ReactElement {
  return <p className={className}>{message}</p>
}
