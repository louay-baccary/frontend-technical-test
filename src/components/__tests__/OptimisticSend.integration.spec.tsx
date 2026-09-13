import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageThread } from '../MessageThread/MessageThread'
import { MessageComposer } from '../MessageComposer/MessageComposer'
import { CurrentUserProvider } from '../../context/CurrentUserContext'
import { ToastProvider } from '../Feedback/ToastProvider'
import { api } from '../../lib/api'
import type { Message } from '../../types/message'
import type { User } from '../../types/user'

// Gap identified in Ticket 12: no existing spec renders MessageComposer and
// MessageThread together and asserts a newly-sent message actually shows up
// in the thread optimistically, then either stays (success) or is rolled
// back (failure). This is the core "bolded robustness" behavior from the
// brief - useSendMessage's optimistic-append/rollback was only ever
// verified at the hook/mock level, never through the rendered thread.

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

const users: User[] = [{ id: 1, nickname: 'Thibaut', token: 'x' }]

function renderThreadAndComposer() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ToastProvider>
          <MessageThread />
          <MessageComposer />
        </ToastProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('optimistic send, visible end-to-end through the rendered thread', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockedApi.getUsers.mockResolvedValue({ ok: true, data: users })
  })

  it('shows the message immediately on submit, before the server responds, and keeps it after success', async () => {
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: [] })

    let resolveSend: (value: unknown) => void = () => {}
    mockedApi.sendMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve
      })
    )

    renderThreadAndComposer()

    await screen.findByText('Aucun message. Écrivez le premier !')

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Hello optimistic' } })
    fireEvent.submit(input.closest('form')!)

    // Optimistic: visible immediately, well before the mocked request settles.
    expect(await screen.findByText('Hello optimistic')).toBeInTheDocument()

    // Server confirms - the invalidate-triggered refetch returns the real
    // persisted message, and it must still be showing afterward.
    mockedApi.getMessages.mockResolvedValue({
      ok: true,
      data: [{ id: 99, conversationId: 1, authorId: 1, timestamp: Date.now(), body: 'Hello optimistic' }],
    })
    resolveSend({ ok: true, data: { id: 99 } })

    await waitFor(() => expect(mockedApi.getMessages).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Hello optimistic')).toBeInTheDocument()
  })

  it('shows the message immediately, then rolls it back out of the thread on failure', async () => {
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: [] })

    // Controlled timing: a plain mockResolvedValue settles in the same tick
    // as the optimistic append, so the transient "shown, then rolled back"
    // state is never actually observable - it would resolve before the
    // first findByText check even runs. Hold it open until we've confirmed
    // the optimistic message is visible, then let the failure land.
    let resolveSend: (value: unknown) => void = () => {}
    mockedApi.sendMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve
      })
    )

    renderThreadAndComposer()

    await screen.findByText('Aucun message. Écrivez le premier !')

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Hello doomed' } })
    fireEvent.submit(input.closest('form')!)

    // Optimistic: visible immediately, before the send has even settled.
    expect(await screen.findByText('Hello doomed')).toBeInTheDocument()

    resolveSend({ ok: false, status: 0, message: 'Network error, please check your connection' })

    // Rolled back: removed from the thread once the send fails, replaced by
    // the empty state again, with the failure surfaced via the composer's
    // own failed banner instead.
    await waitFor(() => expect(screen.queryByText('Hello doomed')).not.toBeInTheDocument())
    expect(screen.getByText('Aucun message. Écrivez le premier !')).toBeInTheDocument()
    expect(screen.getByText(/Échec de l'envoi/)).toBeInTheDocument()
  })
})
