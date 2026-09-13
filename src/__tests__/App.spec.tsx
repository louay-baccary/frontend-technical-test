import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../pages'
import { CurrentUserProvider } from '../context/CurrentUserContext'
import { ToastProvider } from '../components/Feedback/ToastProvider'
import { api } from '../lib/api'

jest.mock('../lib/api')

const mockRouter: { query: Record<string, string> } = { query: {} }

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: mockRouter.query,
    pathname: '/',
    asPath: '/',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

const mockedApi = api as jest.Mocked<typeof api>

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ToastProvider>
          <Home />
        </ToastProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('App', () => {
  beforeEach(() => {
    mockRouter.query = {}
    mockedApi.getUsers.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, nickname: 'Thibaut', token: 'xxxx' },
        { id: 2, nickname: 'Jeremie', token: 'xxxx' },
      ],
    })
    mockedApi.getMessages.mockResolvedValue({ ok: true, data: [] })
  })

  it('renders the app shell with conversation-list and thread landmarks', () => {
    renderApp()

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders a labeled user switcher populated from useUsers', async () => {
    renderApp()

    expect(screen.getByRole('combobox', { name: /afficher en tant que/i })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Thibaut' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Jeremie' })).toBeInTheDocument()
  })

  it('renders the language switcher with accessible names for each locale', () => {
    renderApp()

    // router.locale is mocked to 'fr', so labels render in French; the keys
    // themselves (appShell.switchToFrench/switchToEnglish) are exercised
    // under both locales in useTranslations' own usage, see i18n docs.
    expect(screen.getByRole('link', { name: /passer en français/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /passer en anglais/i })).toBeInTheDocument()
  })

  it('does not leak an unsent draft from one conversation into another after switching (regression)', async () => {
    mockRouter.query = { conversationId: '1' }
    const { rerender } = renderApp()

    const input = await screen.findByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Draft meant for conversation 1' } })
    expect(input).toHaveValue('Draft meant for conversation 1')

    // Switch to a different conversation - the composer must remount, not
    // keep showing conversation 1's unsent draft.
    mockRouter.query = { conversationId: '2' }
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CurrentUserProvider>
          <ToastProvider>
            <Home />
          </ToastProvider>
        </CurrentUserProvider>
      </QueryClientProvider>
    )

    const inputAfterSwitch = await screen.findByPlaceholderText('Écrivez un message...')
    expect(inputAfterSwitch).toHaveValue('')
  })
})
