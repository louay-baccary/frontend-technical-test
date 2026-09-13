import type { AppProps } from 'next/app'
import { QueryClientProvider } from '@tanstack/react-query'
import { getLoggedUserId } from '../utils/getLoggedUserId'
import { queryClient } from '../lib/queryClient'
import { CurrentUserProvider } from '../context/CurrentUserContext'
import { ToastProvider } from '../components/Feedback/ToastProvider'
import '../styles/globals.css'

// Default way to get a logged user
export const loggedUserId = getLoggedUserId()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}
