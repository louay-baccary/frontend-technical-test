import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from '../pages'
import { CurrentUserProvider } from '../context/CurrentUserContext'
import { api } from '../lib/api'

jest.mock('../lib/api')

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
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
        <Home />
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('App', () => {
  beforeEach(() => {
    mockedApi.getUsers.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, nickname: 'Thibaut', token: 'xxxx' },
        { id: 2, nickname: 'Jeremie', token: 'xxxx' },
      ],
    })
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
})
