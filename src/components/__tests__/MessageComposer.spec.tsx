import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageComposer } from '../MessageComposer/MessageComposer'
import { CurrentUserProvider } from '../../context/CurrentUserContext'
import { ToastProvider } from '../Feedback/ToastProvider'
import { api } from '../../lib/api'

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

function renderComposer() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ToastProvider>
          <MessageComposer />
        </ToastProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

function getInput() {
  return screen.getByPlaceholderText('Écrivez un message...')
}

describe('MessageComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks an empty submit and shows the validation error, without calling the API', () => {
    renderComposer()

    fireEvent.submit(getInput().closest('form')!)

    expect(screen.getByText('Le message ne peut pas être vide')).toBeInTheDocument()
    expect(mockedApi.sendMessage).not.toHaveBeenCalled()
  })

  it('disables the input and send button while a send is in flight', async () => {
    let resolveSend: (value: unknown) => void = () => {}
    mockedApi.sendMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveSend = resolve
      })
    )

    renderComposer()

    fireEvent.change(getInput(), { target: { value: 'Hello' } })
    fireEvent.submit(getInput().closest('form')!)

    await waitFor(() => expect(getInput()).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Envoi en cours...' })).toBeDisabled()

    resolveSend({ ok: true, data: { id: 42 } })
    await waitFor(() => expect(getInput()).not.toBeDisabled())
  })

  it('shows a failed banner with the specific 503 service-unavailable message, not a generic error', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      ok: false,
      status: 503,
      message: 'Service temporarily unavailable',
    })

    renderComposer()

    fireEvent.change(getInput(), { target: { value: 'Hello' } })
    fireEvent.submit(getInput().closest('form')!)

    // A toast (role="status") now also fires with the same text, so scope
    // this to the persistent failed banner specifically (identity-obj-proxy
    // maps CSS module classes to their literal name under Jest).
    expect(
      await screen.findByText(/Service temporarily unavailable/, { selector: '.failedText' })
    ).toBeInTheDocument()
  })

  it('shows a failed banner for a generic network failure too, with its own message', async () => {
    mockedApi.sendMessage.mockResolvedValue({
      ok: false,
      status: 0,
      message: 'Network error, please check your connection',
    })

    renderComposer()

    fireEvent.change(getInput(), { target: { value: 'Hello' } })
    fireEvent.submit(getInput().closest('form')!)

    expect(
      await screen.findByText(/Network error, please check your connection/, { selector: '.failedText' })
    ).toBeInTheDocument()
  })

  it('disables the retry control while its own retry is in flight, and a fast double-click sends only once', async () => {
    mockedApi.sendMessage.mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: 'Service temporarily unavailable',
    })

    renderComposer()

    fireEvent.change(getInput(), { target: { value: 'Hello' } })
    fireEvent.submit(getInput().closest('form')!)

    const retryButton = await screen.findByRole('button', { name: 'Réessayer' })

    let resolveRetry: (value: unknown) => void = () => {}
    mockedApi.sendMessage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve
      })
    )

    // Fast double-click: the second click must be a no-op while the first
    // retry attempt is still in flight.
    fireEvent.click(retryButton)
    fireEvent.click(retryButton)

    await waitFor(() => expect(retryButton).toBeDisabled())

    resolveRetry({ ok: true, data: { id: 43 } })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument())

    // One call for the original failed send, exactly one more for the retry.
    expect(mockedApi.sendMessage).toHaveBeenCalledTimes(2)
  })
})
