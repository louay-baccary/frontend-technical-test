import { api } from '../api'

describe('api', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('maps a 503 response to the service-unavailable ApiResult, distinct from a network failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '',
    }) as jest.Mock

    const result = await api.getConversations(1)

    expect(result).toEqual({
      ok: false,
      status: 503,
      message: 'Service temporarily unavailable',
    })
  })

  it('maps a network/connection failure to status 0, not a 503', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('failed to fetch')) as jest.Mock

    const result = await api.getConversations(1)

    expect(result).toEqual({
      ok: false,
      status: 0,
      message: 'Network error, please check your connection',
    })
  })

  it('aborts and reports a distinct timeout, instead of hanging forever with no network', async () => {
    jest.useFakeTimers()

    global.fetch = jest.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    }) as jest.Mock

    let settled = false
    const resultPromise = api.getConversations(1).then((result) => {
      settled = true
      return result
    })

    // Just under the timeout: the request must still be hanging, unresolved.
    jest.advanceTimersByTime(14_999)
    await Promise.resolve()
    await Promise.resolve()
    expect(settled).toBe(false)

    // Crossing the timeout: it must resolve now, not hang indefinitely.
    jest.advanceTimersByTime(1)
    const result = await resultPromise

    expect(settled).toBe(true)
    expect(result).toEqual({
      ok: false,
      status: 0,
      message: 'Request timed out, please check your connection',
    })

    jest.useRealTimers()
  })

  it('still resolves within the timeout even if fetch() never settles at all, not even reacting to abort', async () => {
    // Simulates the worst case raised during manual testing: some browsers
    // can leave a fetch sitting in a permanently pending state while
    // genuinely offline (DevTools "Offline" throttling), never rejecting
    // even once AbortController.abort() is called. The timeout must not
    // depend on fetch() ever settling.
    jest.useFakeTimers()

    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock

    const resultPromise = api.getConversations(1)

    await jest.advanceTimersByTimeAsync(15_000)
    const result = await resultPromise

    expect(result).toEqual({
      ok: false,
      status: 0,
      message: 'Request timed out, please check your connection',
    })

    jest.useRealTimers()
  })
})
