import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import useUser from '@/context/useUser.tsx'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import {
  RouterProvider as TanStackRouterProvider,
  createRouter,
} from '@tanstack/react-router'
import { ThemeProvider } from './components/theme-provider.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { routeTree } from './routeTree.gen'

const client = new QueryClient()

// Create a new router instance
const router = createRouter({
  routeTree,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
    context: {
      user: import('@/context/UserContext').User
    }
  }
}

function AppRouter() {
  const { user } = useUser()
  return <TanStackRouterProvider router={router} context={{ user }} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="disaster">
      <QueryClientProvider client={client}>
        <UserProvider>
          <AppRouter />
        </UserProvider>
        <div className="print:hidden">
          <ReactQueryDevtools initialIsOpen={false} />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
