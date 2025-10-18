import React, { Suspense } from 'react'
import App from './App'
import MemberList from './pages/members/MemberList'
import { createRootRoute, createRoute } from '@tanstack/react-router'
import Layout from './pages/nav/Layout'
import RequireAuth from './components/RequireAuth'
import { LoginForm } from './components/auth/LoginForm'
import { SignupForm } from './components/auth/SignupForm'
import Home from './pages/home/Home'
import AddMember from './pages/members/AddMember'
import EditMember from './pages/members/EditMember'
import MapDisplay from './pages/map/MapDisplay'
import Districts from './pages/districts/Districts'
import AddDistrict from './pages/districts/AddDistrict'
import EditDistrict from './pages/districts/EditDistrict'
import Settings from './pages/settings/Settings'
import UploadMembers from './pages/members/UploadMembers'
import WardAdmin from './pages/home/WardAdmin'

const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'))
const PrintAllDistricts = React.lazy(() => import('./pages/districts/PrintAllDistricts'))
const PrintDistrict = React.lazy(() => import('./pages/districts/PrintDistrict'))
const ShowOneDistrictMap = React.lazy(() => import('./pages/districts/ShowOneDistrictMap'))

// Root route
// Create root route first
export const routeTree = createRootRoute({
  component: App,
})

// Top-level auth-free routes
export const loginRoute = createRoute({
  getParentRoute: () => routeTree,
  path: 'login',
  component: LoginForm,
})

export const signupRoute = createRoute({
  getParentRoute: () => routeTree,
  path: 'signup',
  component: SignupForm,
})

// Layout route
export const layoutRoute = createRoute({
  getParentRoute: () => routeTree,
  path: '/',
  component: Layout,
})

// Auth-protected parent route
export const authWrapper = createRoute({
  getParentRoute: () => layoutRoute,
  id: 'auth',
  component: RequireAuth,
})

// Child routes under authWrapper
export const homeRoute = createRoute({ getParentRoute: () => authWrapper, path: 'home', component: Home })
export const adminRoute = createRoute({
  getParentRoute: () => authWrapper,
  path: 'admin',
  component: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  ),
})
export const districtsRoute = createRoute({ getParentRoute: () => authWrapper, path: 'districts', component: Districts })
export const addDistrictRoute = createRoute({ getParentRoute: () => authWrapper, path: 'adddistrict', component: AddDistrict })
export const editDistrictRoute = createRoute({ getParentRoute: () => authWrapper, path: 'district/:districtId', component: EditDistrict })
export const printDistrictRoute = createRoute({
  getParentRoute: () => authWrapper,
  path: 'printdistrict/:districtId',
  component: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <PrintDistrict />
    </Suspense>
  ),
})
export const viewDistrictRoute = createRoute({ getParentRoute: () => authWrapper, path: 'viewdistrict/:districtId', component: ShowOneDistrictMap })
export const printDistrictsRoute = createRoute({
  getParentRoute: () => authWrapper,
  path: 'printdistricts',
  component: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <PrintAllDistricts />
    </Suspense>
  ),
})
export const membersRoute = createRoute({ getParentRoute: () => authWrapper, path: 'members', component: MemberList })
export const addMemberRoute = createRoute({ getParentRoute: () => authWrapper, path: 'addmember', component: AddMember })
export const editMemberRoute = createRoute({ getParentRoute: () => authWrapper, path: 'editmember/:memberId', component: EditMember })
export const uploadMembersRoute = createRoute({ getParentRoute: () => authWrapper, path: 'upload', component: UploadMembers })
export const mapRoute = createRoute({ getParentRoute: () => authWrapper, path: 'map', component: () => <div className="h-screen"><MapDisplay showLabel={false} /></div> })
export const settingsRoute = createRoute({ getParentRoute: () => authWrapper, path: 'settings', component: Settings })
export const rootWardRoute = createRoute({ getParentRoute: () => authWrapper, path: '/', component: WardAdmin })

export default routeTree
