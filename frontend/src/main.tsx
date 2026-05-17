import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import {
  createRouter,
  RouterProvider as TanStackRouterProvider,
} from '@tanstack/react-router'
import useUser from '@/context/useUser.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { routeTree } from './routeTree.gen'

const client = new QueryClient()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { user: {} as import('@/context/UserContext').User },
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function AppRouter() {
  const { user } = useUser()
  return <TanStackRouterProvider router={router} context={{ user }} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>
      <ThemeProvider defaultTheme="dark" storageKey="disaster">
        <QueryClientProvider client={client}>
          <UserProvider>
            <AppRouter />
          </UserProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
