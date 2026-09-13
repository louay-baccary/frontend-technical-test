import { useQuery, useQueries } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCurrentUser } from '../context/CurrentUserContext'
import type { Conversation } from '../types/conversation'
import type { Message } from '../types/message'

export interface ConversationWithPreview extends Conversation {
  previewText: string | null
}

export function useConversations() {
  const { currentUserId } = useCurrentUser()

  const conversationsQuery = useQuery({
    queryKey: ['conversations', currentUserId],
    queryFn: async () => {
      const result = await api.getConversations(currentUserId)
      if (!result.ok) throw result
      return result.data
    },
  })

  const conversations = conversationsQuery.data ?? []

  // Warm the messages cache per conversation so we can show a last-message
  // preview, and so opening a conversation afterward is instant.
  // Trade-off documented in the README: a real system would denormalize
  // this onto the Conversation object server-side instead.
  const previewQueries = useQueries({
    queries: conversations.map((conv) => ({
      queryKey: ['messages', conv.id],
      queryFn: async () => {
        const result = await api.getMessages(conv.id)
        if (!result.ok) throw result
        return result.data
      },
      enabled: conversationsQuery.isSuccess,
      staleTime: 10_000,
    })),
  })

  const conversationsWithPreview: ConversationWithPreview[] = conversations
    .map((conv, i) => {
      const messages = previewQueries[i]?.data as Message[] | undefined
      const last = messages?.[messages.length - 1]
      return { ...conv, previewText: last?.body ?? null }
    })
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)

  return {
    ...conversationsQuery,
    data: conversationsWithPreview,
  }
}
