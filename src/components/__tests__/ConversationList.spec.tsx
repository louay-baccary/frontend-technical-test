import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConversationList } from '../ConversationList/ConversationList'
import { CurrentUserProvider } from '../../context/CurrentUserContext'
import { ToastProvider } from '../Feedback/ToastProvider'
import { api } from '../../lib/api'
import type { Conversation } from '../../types/conversation'
import type { Message } from '../../types/message'

jest.mock('../../lib/api')

const push = jest.fn()

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    pathname: '/',
    asPath: '/',
    locale: 'fr',
    push,
  }),
}))

const mockedApi = api as jest.Mocked<typeof api>

const conversations: Conversation[] = [
  {
    id: 1,
    recipientId: 2,
    recipientNickname: 'Jeremie',
    senderId: 1,
    senderNickname: 'Thibaut',
    lastMessageTimestamp: 1620000000,
  },
  {
    id: 2,
    recipientId: 3,
    recipientNickname: 'Patrick',
    senderId: 1,
    senderNickname: 'Thibaut',
    lastMessageTimestamp: 1625000000,
  },
  {
    id: 3,
    // zero-message conversation: senderId 1 is the current user, no messages yet
    recipientId: 4,
    recipientNickname: 'Elodie',
    senderId: 1,
    senderNickname: 'Thibaut',
    lastMessageTimestamp: 1626000000,
  },
]

const messagesByConversation: Record<number, Message[]> = {
  1: [
    { id: 1, conversationId: 1, authorId: 1, timestamp: 1620000000, body: 'Hello from conv 1' },
  ],
  2: [
    { id: 2, conversationId: 2, authorId: 2, timestamp: 1625000000, body: 'Hello from conv 2' },
  ],
  3: [],
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ToastProvider>
          <ConversationList />
        </ToastProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('ConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a loading skeleton before data resolves', () => {
    mockedApi.getConversations.mockReturnValue(new Promise(() => {}))

    renderList()

    expect(screen.getByRole('list', { hidden: true })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows the empty state when there are no conversations', async () => {
    mockedApi.getConversations.mockResolvedValue({ ok: true, data: [] })

    renderList()

    expect(await screen.findByText('Aucune conversation pour le moment')).toBeInTheDocument()
  })

  it('shows an error state with a working retry button', async () => {
    mockedApi.getConversations
      .mockResolvedValueOnce({ ok: false, status: 503, message: 'Service temporarily unavailable' })
      .mockResolvedValueOnce({ ok: true, data: [] })

    renderList()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Impossible de charger les conversations')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByText('Aucune conversation pour le moment')).toBeInTheDocument()
  })

  it('renders conversations sorted by lastMessageTimestamp descending, with real preview text', async () => {
    mockedApi.getConversations.mockResolvedValue({ ok: true, data: conversations })
    mockedApi.getMessages.mockImplementation(async (conversationId: number) => ({
      ok: true,
      data: messagesByConversation[conversationId] ?? [],
    }))

    renderList()

    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(3)

    // conv 3 (1626000000) > conv 2 (1625000000) > conv 1 (1620000000)
    expect(items[0]).toHaveTextContent('Elodie')
    expect(items[1]).toHaveTextContent('Patrick')
    expect(items[1]).toHaveTextContent('Hello from conv 2')
    expect(items[2]).toHaveTextContent('Jeremie')
    expect(items[2]).toHaveTextContent('Hello from conv 1')
  })

  it('shows the noMessagesPreview fallback for a conversation with zero messages, not blank or crashed', async () => {
    mockedApi.getConversations.mockResolvedValue({ ok: true, data: conversations })
    mockedApi.getMessages.mockImplementation(async (conversationId: number) => ({
      ok: true,
      data: messagesByConversation[conversationId] ?? [],
    }))

    renderList()

    expect(await screen.findByText("Aucun message pour l'instant")).toBeInTheDocument()
  })

  it('warms the messages cache per conversation id, not a single shared key (race-condition guard)', async () => {
    mockedApi.getConversations.mockResolvedValue({ ok: true, data: conversations })
    mockedApi.getMessages.mockImplementation(async (conversationId: number) => ({
      ok: true,
      data: messagesByConversation[conversationId] ?? [],
    }))

    renderList()

    await waitFor(() => {
      expect(mockedApi.getMessages).toHaveBeenCalledWith(1)
      expect(mockedApi.getMessages).toHaveBeenCalledWith(2)
      expect(mockedApi.getMessages).toHaveBeenCalledWith(3)
    })
  })
})
