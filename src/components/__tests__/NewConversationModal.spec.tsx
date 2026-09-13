import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewConversationModal from '../NewConversationModal/NewConversationModal'
import { CurrentUserProvider } from '../../context/CurrentUserContext'
import { api } from '../../lib/api'
import type { Conversation } from '../../types/conversation'
import type { User } from '../../types/user'

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

const users: User[] = [
  { id: 1, nickname: 'Thibaut', token: 'x' },
  { id: 2, nickname: 'Jeremie', token: 'x' },
  { id: 3, nickname: 'Patrick', token: 'x' },
]

// Current user (1) already has a conversation with 2 - only 3 is eligible.
const conversations: Conversation[] = [
  { id: 1, recipientId: 2, recipientNickname: 'Jeremie', senderId: 1, senderNickname: 'Thibaut', lastMessageTimestamp: 1 },
]

function renderModal(onClose = jest.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <NewConversationModal onClose={onClose} />
      </CurrentUserProvider>
    </QueryClientProvider>
  )
  return { ...utils, onClose }
}

describe('NewConversationModal', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    push.mockClear()
    mockedApi.getUsers.mockResolvedValue({ ok: true, data: users })
    mockedApi.getConversations.mockResolvedValue({ ok: true, data: conversations })
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: [] })
  })

  it('excludes self and existing recipients (both directions), only offering eligible users', async () => {
    renderModal()

    const select = screen.getByLabelText('Choisir un destinataire')
    // Waiting for the real option to appear, not just the select element
    // itself - the select renders immediately with only the placeholder
    // option, before users/conversations data has loaded.
    await screen.findByRole('option', { name: 'Patrick' })

    expect(screen.queryByRole('option', { name: 'Thibaut' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Jeremie' })).not.toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Patrick' })).toBeInTheDocument()
  })

  it('shows an error message and re-enables Create when the server rejects the request, instead of hanging or failing silently', async () => {
    mockedApi.createConversation.mockResolvedValue({
      ok: false,
      status: 503,
      message: 'Service temporarily unavailable',
    })

    renderModal()

    const select = screen.getByLabelText('Choisir un destinataire')
    await screen.findByRole('option', { name: 'Patrick' })
    fireEvent.change(select, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Service temporarily unavailable')
    expect(screen.getByRole('button', { name: 'Créer' })).not.toBeDisabled()
    expect(push).not.toHaveBeenCalled()
  })

  it('disables Create while the mutation is in flight, so a fast double-click only creates one conversation', async () => {
    let resolveCreate: (value: unknown) => void = () => {}
    mockedApi.createConversation.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )

    renderModal()

    const select = screen.getByLabelText('Choisir un destinataire')
    await screen.findByRole('option', { name: 'Patrick' })
    fireEvent.change(select, { target: { value: '3' } })

    const createButton = screen.getByRole('button', { name: 'Créer' })
    fireEvent.click(createButton)
    fireEvent.click(createButton)

    await waitFor(() => expect(createButton).toBeDisabled())
    expect(mockedApi.createConversation).toHaveBeenCalledTimes(1)

    resolveCreate({ ok: true, data: { id: 99 } })
  })

  it('creates the conversation, navigates to it, and closes on success', async () => {
    mockedApi.createConversation.mockResolvedValue({ ok: true, data: { id: 99 } })

    const { onClose } = renderModal()

    const select = screen.getByLabelText('Choisir un destinataire')
    await screen.findByRole('option', { name: 'Patrick' })
    fireEvent.change(select, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ conversationId: 99 }) })
    )
  })
})
