import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await api.getUsers()
      if (!result.ok) throw result
      return result.data
    },
  })
}
