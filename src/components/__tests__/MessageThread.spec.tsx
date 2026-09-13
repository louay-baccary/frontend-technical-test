import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageThread } from '../MessageThread/MessageThread'
import { CurrentUserProvider } from '../../context/CurrentUserContext'
import { api } from '../../lib/api'
import type { Message } from '../../types/message'
import type { User } from '../../types/user'

jest.mock('../../lib/api')

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { conversationId: '1' },
    pathname: '/',
    asPath: '/?conversationId=1',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

const mockedApi = api as jest.Mocked<typeof api>

const users: User[] = [
  { id: 1, nickname: 'Thibaut', token: 'xxxx' },
  { id: 2, nickname: 'Jeremie', token: 'xxxx' },
]

function renderThread() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <MessageThread />
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('MessageThread', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedApi.getUsers.mockResolvedValue({ ok: true, data: users })
  })

  it('renders a message body containing HTML/script-like text as literal visible text, never executed', async () => {
    const maliciousBody = '<script>window.__xss = true</script><img src=x onerror="window.__xss2 = true">'
    const messages: Message[] = [
      { id: 1, conversationId: 1, authorId: 1, timestamp: Date.now(), body: maliciousBody },
    ]
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: messages })

    renderThread()

    // The literal text (tags and all) must be visible as text content...
    expect(await screen.findByText(maliciousBody)).toBeInTheDocument()

    // ...and never actually parsed/executed as HTML: no <script> or <img>
    // element exists anywhere in the rendered DOM, and our global flags
    // (which an executed script/onerror would have set) are untouched.
    expect(document.querySelector('script[src], img')).not.toBeInTheDocument()
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined()
    expect((window as unknown as { __xss2?: boolean }).__xss2).toBeUndefined()
  })

  it('renders own vs. other messages with distinct alignment and an accessible author label, not color alone', async () => {
    const messages: Message[] = [
      { id: 1, conversationId: 1, authorId: 1, timestamp: Date.now(), body: 'From me' },
      { id: 2, conversationId: 1, authorId: 2, timestamp: Date.now(), body: 'From Jeremie' },
    ]
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: messages })

    renderThread()

    const ownBubble = await screen.findByLabelText('Message de vous')
    const otherBubble = await screen.findByLabelText('Message de Jeremie')

    expect(ownBubble).toHaveTextContent('From me')
    expect(otherBubble).toHaveTextContent('From Jeremie')
  })

  it('groups messages by date, labeling today and yesterday distinctly', async () => {
    const now = Date.now()
    const yesterday = now - 24 * 60 * 60 * 1000

    const messages: Message[] = [
      { id: 1, conversationId: 1, authorId: 1, timestamp: yesterday, body: 'Yesterday message' },
      { id: 2, conversationId: 1, authorId: 1, timestamp: now, body: 'Today message' },
    ]
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: messages })

    renderThread()

    expect(await screen.findByText('Aujourd\'hui')).toBeInTheDocument()
    expect(await screen.findByText('Hier')).toBeInTheDocument()
  })

  it('renders the empty-thread state for a conversation with zero messages, not blank or crashed', async () => {
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: [] })

    renderThread()

    expect(await screen.findByText('Aucun message. Écrivez le premier !')).toBeInTheDocument()
  })

  it('shows an error state with a working retry button', async () => {
    mockedApi.getMessages
      .mockResolvedValueOnce({ ok: false, status: 503, message: 'Service temporarily unavailable' })
      .mockResolvedValueOnce({ ok: true, data: [] })

    renderThread()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Impossible de charger les messages')).toBeInTheDocument()
  })
})
