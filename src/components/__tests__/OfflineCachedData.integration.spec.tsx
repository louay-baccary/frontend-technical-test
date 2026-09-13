import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { MessageThread } from '../MessageThread/MessageThread'
import { MessageComposer } from '../MessageComposer/MessageComposer'
import { ConversationList } from '../ConversationList/ConversationList'
import { CurrentUserProvider } from '../../context/CurrentUserContext'

// Deliberately NOT mocking ../../lib/api - these tests exercise the real
// api.ts and a real QueryClient (configured like production's
// src/lib/queryClient.ts), reproducing the exact enhancement request:
// "when put offline mid-session, already-loaded conversations/messages
// should still be readable from cache, not hidden behind an error screen."

function makeOfflineAwareFetchMock(handlers: Record<string, () => unknown>) {
  let simulateOffline = false
  const fetchMock = jest.fn((url: string) => {
    if (simulateOffline) {
      return Promise.reject(new TypeError('Failed to fetch'))
    }
    for (const [match, getBody] of Object.entries(handlers)) {
      if (url.includes(match)) {
        return Promise.resolve({ ok: true, text: async () => JSON.stringify(getBody()) })
      }
    }
    return new Promise(() => {})
  })
  return {
    fetchMock,
    goOffline: () => {
      simulateOffline = true
    },
  }
}

function makeQueryClient() {
  // Mirrors src/lib/queryClient.ts's networkMode: 'always' - without it,
  // these queries would just pause instead of ever attempting (and
  // failing) the fetch, and this scenario wouldn't reproduce at all.
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  })
}

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { conversationId: '1' },
    pathname: '/',
    asPath: '/?conversationId=1',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

describe('reading from cache while offline mid-session', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    onlineManager.setOnline(true)
    jest.useRealTimers()
  })

  it('keeps showing already-loaded messages after a later invalidate fails while offline, instead of an error screen', async () => {
    jest.useFakeTimers()

    const { fetchMock, goOffline } = makeOfflineAwareFetchMock({
      '/users': () => [{ id: 1, nickname: 'Thibaut', token: 'x' }],
      '/messages/1': () => [
        { id: 1, conversationId: 1, authorId: 1, timestamp: Date.now(), body: 'hello cached' },
      ],
    })
    global.fetch = fetchMock as jest.Mock

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <CurrentUserProvider>
          <MessageThread />
          <MessageComposer />
        </CurrentUserProvider>
      </QueryClientProvider>
    )

    expect(await screen.findByText('hello cached')).toBeInTheDocument()

    // Go offline mid-session, then attempt to send - this triggers
    // useSendMessage's onSettled -> invalidateQueries(['messages', 1]),
    // which fails while offline and sets the query's status to 'error'
    // while its cached data (the message above) remains in place.
    onlineManager.setOnline(false)
    goOffline()

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'sent while offline' } })
    fireEvent.submit(input.closest('form')!)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15_000)
    })

    // The already-loaded message must still be visible...
    expect(screen.getByText('hello cached')).toBeInTheDocument()
    // ...and the thread itself must not be showing its blocking error state
    // (the composer's own failed-send banner, a separate role="alert", is
    // expected and fine here).
    expect(screen.queryByText('Impossible de charger les messages')).not.toBeInTheDocument()
  })

  it('keeps showing already-loaded conversations after a later invalidate fails while offline, instead of an error screen', async () => {
    jest.useFakeTimers()

    const { fetchMock, goOffline } = makeOfflineAwareFetchMock({
      '/conversations/1': () => [
        {
          id: 1,
          recipientId: 2,
          recipientNickname: 'Jeremie',
          senderId: 1,
          senderNickname: 'Thibaut',
          lastMessageTimestamp: 1620000000,
        },
      ],
      '/messages/': () => [],
    })
    global.fetch = fetchMock as jest.Mock

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <CurrentUserProvider>
          <ConversationList />
        </CurrentUserProvider>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Jeremie')).toBeInTheDocument()

    onlineManager.setOnline(false)
    goOffline()

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['conversations', 1] })
      await jest.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Jeremie')).toBeInTheDocument()
    expect(screen.queryByText('Impossible de charger les conversations')).not.toBeInTheDocument()
  })
})
