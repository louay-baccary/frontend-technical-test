import { createContext, useContext, useState, type ReactNode } from 'react'
import { getLoggedUserId } from '../utils/getLoggedUserId'

interface CurrentUserContextValue {
  currentUserId: number
  setCurrentUserId: (id: number) => void
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<number>(getLoggedUserId())
  return (
    <CurrentUserContext.Provider value={{ currentUserId, setCurrentUserId }}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext)
  if (!ctx) throw new Error('useCurrentUser must be used within CurrentUserProvider')
  return ctx
}
