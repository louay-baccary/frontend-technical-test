import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../Feedback/ToastProvider'

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    pathname: '/',
    asPath: '/',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

function TriggerButton() {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast('Something went wrong')}>
      Trigger
    </button>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TriggerButton />
    </ToastProvider>
  )
}

describe('Toast / ToastProvider', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows a toast with role="status" and aria-live="polite", not "assertive"', () => {
    renderWithProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Something went wrong')
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })

  it('does not auto-dismiss before ~5 seconds, giving a screen-reader user time to perceive it', async () => {
    jest.useFakeTimers()
    renderWithProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    expect(screen.getByRole('status')).toBeInTheDocument()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(4900)
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('auto-dismisses at the 5 second mark', async () => {
    jest.useFakeTimers()
    renderWithProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))

    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000)
    })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not dismiss while focused, even past the 5 second mark', async () => {
    jest.useFakeTimers()
    renderWithProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    const toast = screen.getByRole('status')
    fireEvent.focus(toast)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('can be dismissed manually via its own dismiss button', () => {
    renderWithProvider()

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
