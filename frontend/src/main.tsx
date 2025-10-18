import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import {
  createRootRoute,
  createRouter,
  RouterProvider as TanStackRouterProvider,
  createBrowserHistory,
} from '@tanstack/react-router'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from './context/AuthProvider.tsx'

const client = new QueryClient()

const rootRoute = createRootRoute({
  component: App,
})

const history = createBrowserHistory()

const router = createRouter({
  routeTree: rootRoute,
  history,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="disaster">
      <QueryClientProvider client={client}>
        <AuthProvider>
          <TanStackRouterProvider router={router} />
        </AuthProvider>
        <div className="print:hidden">
          <ReactQueryDevtools initialIsOpen={false} />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
