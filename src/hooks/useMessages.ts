import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const result = await api.getMessages(conversationId as number)
      if (!result.ok) throw result
      return result.data
    },
    enabled: conversationId !== null,
  })
}
