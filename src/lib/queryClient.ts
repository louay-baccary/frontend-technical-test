import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      // Default networkMode ('online') silently pauses a query while
      // navigator.onLine is false instead of ever calling queryFn - it just
      // sits pending, with zero network requests, until connectivity
      // returns. 'always' runs queryFn immediately regardless, so our own
      // fetch-level timeout in api.ts actually gets a chance to fail fast
      // and show a real error+retry state instead of an indefinite spinner.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
})
