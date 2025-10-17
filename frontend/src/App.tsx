import AddMember from './pages/members/AddMember'
import EditMember from './pages/members/EditMember'
import MapDisplay from './pages/map/MapDisplay'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Layout from './pages/nav/Layout'
import Districts from './pages/districts/Districts'
import Home from './pages/home/Home'
import RequireAuth from './components/RequireAuth'
import { LoginForm } from './components/auth/LoginForm.tsx'
import React, { Suspense } from 'react'
import MemberList from './pages/members/MemberList'
import Settings from './pages/settings/Settings'
import UploadMembers from './pages/members/UploadMembers'
import AddDistrict from '@/pages/districts/AddDistrict'
import EditDistrict from '@/pages/districts/EditDistrict'
import ShowOneDistrictMap from '@/pages/districts/ShowOneDistrictMap.tsx'
import WardAdmin from '@/pages/home/WardAdmin.tsx'
import { SignupForm } from '@/components/auth/SignupForm.tsx'
import useAuth from '@/hooks/useAuth.tsx'

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'))
const PrintAllDistricts = React.lazy(
  () => import('@/pages/districts/PrintAllDistricts.tsx'),
)
const PrintDistrict = React.lazy(
  () => import('@/pages/districts/PrintDistrict.tsx'),
)

// Prevent logged-in users from seeing login/signup again
const PublicOnlyRoute = () => {
  const { user } = useAuth()
  return user?.email ? <Navigate to="/home" replace /> : <Outlet />
}

function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignupForm />} />
      </Route>
      <Route path="/" element={<Layout />}>
        <Route element={<RequireAuth />}>
          <Route path="home" element={<Home />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route path="districts" element={<Districts />} />
          <Route path="adddistrict" element={<AddDistrict />} />
          <Route path="district/:districtId" element={<EditDistrict />} />
          <Route
            path="printdistrict/:districtId"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <PrintDistrict />
              </Suspense>
            }
          />
          <Route
            path="viewdistrict/:districtId"
            element={<ShowOneDistrictMap />}
          />
          <Route
            path="printdistricts"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <PrintAllDistricts />
              </Suspense>
            }
          />
          <Route path="members" element={<MemberList />} />
          <Route path="addmember" element={<AddMember />} />
          <Route path="editmember/:memberId" element={<EditMember />} />
          <Route path="upload" element={<UploadMembers />} />
          <Route
            path="map"
            element={
              <div className="h-screen">
                <MapDisplay showLabel={false} />
              </div>
            }
          />
          <Route path="settings" element={<Settings />} />
          <Route path="/" element={<WardAdmin />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}

export default App
