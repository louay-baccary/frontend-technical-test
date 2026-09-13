import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'
import type { User } from '../types/user'
import type { ApiResult, CreateConversationBody, CreateMessageBody, CreatedIdResponse } from '../types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
const REQUEST_TIMEOUT_MS = 15_000

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  const controller = new AbortController()

  // Race against fetch() itself, rather than only calling controller.abort()
  // and waiting for fetch to honor it: some browsers can leave a fetch
  // sitting in a pending state indefinitely while genuinely offline (e.g.
  // DevTools "Offline" throttling), never rejecting even once aborted. This
  // timeout promise resolves on its own regardless of what fetch() does, so
  // the caller is guaranteed an answer within REQUEST_TIMEOUT_MS no matter
  // how the underlying network stack behaves.
  let timeoutId: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<ApiResult<T>>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      resolve({ ok: false, status: 0, message: 'Request timed out, please check your connection' })
    }, REQUEST_TIMEOUT_MS)
  })

  const fetchPromise = (async (): Promise<ApiResult<T>> => {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        signal: controller.signal,
      })

      if (!res.ok) {
        const message =
          res.status === 503 ? 'Service temporarily unavailable' :
          res.status === 400 ? 'Invalid request' :
          res.status === 404 ? 'Not found' :
          res.status === 401 ? 'Unauthorized' :
          'Something went wrong'
        return { ok: false, status: res.status, message }
      }

      const text = await res.text()
      const data = text ? JSON.parse(text) : (undefined as T)
      return { ok: true, data }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, status: 0, message: 'Request timed out, please check your connection' }
      }
      return { ok: false, status: 0, message: 'Network error, please check your connection' }
    }
  })()

  try {
    return await Promise.race([timeoutPromise, fetchPromise])
  } finally {
    clearTimeout(timeoutId!)
  }
}

export const api = {
  getConversations: (userId: number) =>
    request<Conversation[]>(`/conversations/${userId}`),

  createConversation: (userId: number, body: CreateConversationBody) =>
    request<CreatedIdResponse>(`/conversations/${userId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMessages: (conversationId: number) =>
    request<Message[]>(`/messages/${conversationId}`),

  sendMessage: (conversationId: number, body: CreateMessageBody) =>
    request<CreatedIdResponse>(`/messages/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getUsers: () => request<User[]>('/users'),

  getUser: (userId: number) => request<User>(`/user/${userId}`),
}
