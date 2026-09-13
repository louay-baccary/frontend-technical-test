import type { ReactElement } from 'react'

interface LoadingSkeletonProps {
  count?: number
  containerTag?: 'ul' | 'div'
  itemTag?: 'li' | 'div'
  containerClassName?: string
  itemClassName?: string
}

export function LoadingSkeleton({
  count = 3,
  containerTag = 'div',
  itemTag = 'div',
  containerClassName,
  itemClassName,
}: LoadingSkeletonProps): ReactElement {
  const Container = containerTag
  const Item = itemTag

  return (
    <Container className={containerClassName} aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <Item key={index} className={itemClassName} aria-hidden="true" />
      ))}
    </Container>
  )
}
