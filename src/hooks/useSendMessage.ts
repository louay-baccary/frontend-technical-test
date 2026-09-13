import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Message } from '../types/message'
import { useCurrentUser } from '../context/CurrentUserContext'

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient()
  const { currentUserId } = useCurrentUser()

  return useMutation({
    mutationFn: async (bodyText: string) => {
      const result = await api.sendMessage(conversationId, {
        body: bodyText,
        timestamp: Date.now(),
        conversationId,
        authorId: currentUserId,
      })
      if (!result.ok) throw result
      return result.data
    },
    onMutate: async (bodyText: string) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] })
      const previous = queryClient.getQueryData<Message[]>(['messages', conversationId])

      const optimisticMessage: Message = {
        id: -Date.now(),
        conversationId,
        authorId: currentUserId,
        timestamp: Date.now(),
        body: bodyText,
      }

      queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => [
        ...old,
        optimisticMessage,
      ])

      return { previous }
    },
    onError: (_err, _bodyText, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['messages', conversationId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    },
  })
}
