import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Conversation } from '../types/conversation'
import { useCurrentUser } from '../context/CurrentUserContext'

interface CreateConversationInput {
  recipientId: number
  recipientNickname: string
  senderNickname: string
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { currentUserId } = useCurrentUser()

  return useMutation({
    mutationFn: async (input: CreateConversationInput) => {
      const result = await api.createConversation(currentUserId, {
        recipientId: input.recipientId,
        senderId: currentUserId,
        senderNickname: input.senderNickname,
        recipientNickname: input.recipientNickname,
        lastMessageTimestamp: Date.now(),
      })
      if (!result.ok) throw result
      return { ...result.data, ...input, senderId: currentUserId, lastMessageTimestamp: Date.now() }
    },
    onSuccess: (created) => {
      // Deliberately NOT invalidating/refetching ['conversations', currentUserId]:
      // the mock server's middleware was fixed (Ticket 1), but trusting the
      // mutation's own response instead of a redundant refetch is still good
      // practice, so the cache-merge pattern stays.
      queryClient.setQueryData<Conversation[]>(['conversations', currentUserId], (old = []) => [
        ...old,
        created as Conversation,
      ])
    },
  })
}
