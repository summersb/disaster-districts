import { Outlet } from '@tanstack/react-router'
import type React from 'react'

// App is the shell for TanStack Router route rendering.
export default function App(): React.ReactElement {
  return <Outlet />
}
