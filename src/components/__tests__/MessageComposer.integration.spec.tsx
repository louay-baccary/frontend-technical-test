import { render, screen, fireEvent, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { MessageComposer } from '../MessageComposer/MessageComposer'
import { CurrentUserProvider } from '../../context/CurrentUserContext'

// Deliberately NOT mocking ../../lib/api here - this test exercises the real
// api.ts (real fetch wrapper, real AbortController timeout), unlike
// MessageComposer.spec.tsx which mocks the API layer away entirely and so
// never actually runs this code path.

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: { conversationId: '1' },
    pathname: '/',
    asPath: '/?conversationId=1',
    locale: 'fr',
    push: jest.fn(),
  }),
}))

function renderComposer() {
  // Mirrors the mutations.networkMode: 'always' set on the real queryClient
  // in src/lib/queryClient.ts - without it, this client would behave
  // exactly like the bug: pausing mutations instead of running them while
  // the browser reports itself offline.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { networkMode: 'always' },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <MessageComposer />
      </CurrentUserProvider>
    </QueryClientProvider>
  )
}

describe('MessageComposer (real api.ts integration, no mocking of the API layer)', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
    onlineManager.setOnline(true)
  })

  it('flips from sending to failed within the 15s timeout when the network truly hangs (e.g. DevTools Offline), not stuck forever', async () => {
    jest.useFakeTimers()

    // Simulate a genuinely dead network: fetch never settles on its own,
    // only reacts to the AbortController's signal - exactly what "no
    // network" looks like in Chrome DevTools, as opposed to a fast
    // connection-refused (killed server).
    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    }) as jest.Mock

    renderComposer()

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Hello with no network' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByRole('button', { name: 'Envoi en cours...' })).toBeDisabled()

    // Advance past the 15s request timeout using the *Async* variant, which
    // flushes microtasks between each tick - a plain advanceTimersByTime
    // fires the setTimeout callback but does not pump the promise chain
    // (abort -> fetch rejection -> mutationFn -> onError -> setState) that
    // depends on it, leaving the test (and, it turns out, the real app)
    // looking like it never resolves.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(15_000)
    })

    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeDisabled()
    expect(screen.getByText(/Request timed out, please check your connection/)).toBeInTheDocument()
  })

  it('still recovers even if fetch() never settles at all, not even reacting to the abort signal', async () => {
    jest.useFakeTimers()

    // Worse than the case above: fetch() doesn't even acknowledge the
    // AbortController - some browsers can leave a fetch permanently pending
    // while genuinely offline. The composer must not depend on fetch()
    // ever settling to recover.
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock

    renderComposer()

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Hello with a truly dead fetch' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByRole('button', { name: 'Envoi en cours...' })).toBeDisabled()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15_000)
    })

    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeDisabled()
    expect(screen.getByText(/Request timed out, please check your connection/)).toBeInTheDocument()
  })

  it('still attempts (and times out) a send when the browser reports itself offline, instead of silently pausing forever with zero requests', async () => {
    // This is the actual root cause behind "DevTools set to Offline, click
    // Send, stuck forever with zero network requests": TanStack Query's
    // default networkMode ('online') doesn't even call mutationFn while
    // navigator.onLine is false - it just pauses, invisibly, until
    // connectivity returns. Neither of the two tests above ever triggers
    // this, because jsdom's navigator.onLine is always true unless we set
    // onlineManager.setOnline(false) ourselves, which is exactly what real
    // "Offline" throttling does in a real browser.
    jest.useFakeTimers()
    onlineManager.setOnline(false)

    const fetchMock = jest.fn(() => new Promise(() => {}))
    global.fetch = fetchMock as jest.Mock

    renderComposer()

    const input = screen.getByPlaceholderText('Écrivez un message...')
    fireEvent.change(input, { target: { value: 'Hello while reported offline' } })
    fireEvent.submit(input.closest('form')!)

    // Let React Query decide whether to actually invoke mutationFn. With
    // the default networkMode, fetch would never be called at all here.
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalled()

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15_000)
    })

    expect(screen.getByRole('button', { name: 'Envoyer' })).not.toBeDisabled()
    expect(screen.getByText(/Request timed out, please check your connection/)).toBeInTheDocument()
  })
})
