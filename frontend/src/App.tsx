import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AdminRoute } from './auth/AdminRoute'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { NavBar } from './components/NavBar'
import { AdminBookingsPage } from './pages/AdminBookingsPage'
import { AdminBusinessRulesPage } from './pages/AdminBusinessRulesPage'
import { AdminServicesPage } from './pages/AdminServicesPage'
import { AdminTimeSlotsPage } from './pages/AdminTimeSlotsPage'
import { AssistantPage } from './pages/AssistantPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyBookingsPage } from './pages/MyBookingsPage'
import { RegisterPage } from './pages/RegisterPage'
import { ServiceDetailPage } from './pages/ServiceDetailPage'
import { ServicesPage } from './pages/ServicesPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
            <Route
              path="/admin/business-rules"
              element={<AdminBusinessRulesPage />}
            />
            <Route path="/admin/services" element={<AdminServicesPage />} />
            <Route path="/admin/time-slots" element={<AdminTimeSlotsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
