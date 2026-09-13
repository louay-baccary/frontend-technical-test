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
})
