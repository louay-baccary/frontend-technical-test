import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../Layout/ThemeToggle'

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    pathname: '/',
    asPath: '/',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

describe('ThemeToggle', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  function mockSystemPrefersDark(prefersDark: boolean) {
    window.matchMedia = jest.fn().mockReturnValue({ matches: prefersDark }) as unknown as typeof window.matchMedia
  }

  it('toggles data-theme on <html> and persists the choice to localStorage', () => {
    mockSystemPrefersDark(false)
    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Passer en mode sombre' })
    fireEvent.click(button)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('theme-preference')).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Passer en mode clair' }))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(window.localStorage.getItem('theme-preference')).toBe('light')
  })

  it('starts from the OS preference when no choice has been made yet', () => {
    mockSystemPrefersDark(true)
    render(<ThemeToggle />)

    // System already prefers dark, so the first click should offer to
    // switch to light (i.e. the button reflects "currently dark").
    expect(screen.getByRole('button', { name: 'Passer en mode clair' })).toBeInTheDocument()
  })
})
