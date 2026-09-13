import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'
import type { User } from '../types/user'
import type { ApiResult, CreateConversationBody, CreateMessageBody, CreatedIdResponse } from '../types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
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
    return { ok: false, status: 0, message: 'Network error, please check your connection' }
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
