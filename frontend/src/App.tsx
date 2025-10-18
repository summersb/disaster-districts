import React from 'react'
import { Outlet } from '@tanstack/react-router'

// App is the shell for TanStack Router route rendering.
export default function App(): React.ReactElement {
  return <Outlet />
}
