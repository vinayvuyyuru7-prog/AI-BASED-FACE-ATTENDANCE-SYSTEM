import React, { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Navbar    from './components/Navbar'
import Hero      from './components/Hero'
import Register  from './components/Register'
import Attendance from './components/Attendance'
import Dashboard from './components/Dashboard'
import AdminLogin   from './components/AdminLogin'
import AdminDashboard from './components/AdminDashboard'
import useStore  from './store/useStore'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const { fetchStudents, fetchTodayAttendance, fetchWeekHistory, adminToken, restoreAdminAuth } = useStore()

  // Fetch initial data on mount
  useEffect(() => {
    restoreAdminAuth()
    fetchStudents()
    fetchTodayAttendance()
    fetchWeekHistory()
  }, [])

  // Refresh attendance every 30 s when on attendance tab
  useEffect(() => {
    if (activeTab !== 'attendance') return
    const id = setInterval(fetchTodayAttendance, 30_000)
    return () => clearInterval(id)
  }, [activeTab])

  const renderTab = () => {
    switch (activeTab) {
      case 'home':       return <Hero       setActiveTab={setActiveTab} />
      case 'register':   return <Register   />
      case 'attendance': return <Attendance />
      case 'dashboard':  return <Dashboard  />
      case 'admin':      return adminToken ? <AdminDashboard /> : <AdminLogin onSuccess={() => setActiveTab('admin')} />
      default:           return <Hero       setActiveTab={setActiveTab} />
    }
  }

  return (
    <div className="min-h-screen">
      {/* Animated mesh background */}
      <div className="mesh-bg grid-pattern" />

      {/* Floating ambient orbs */}
      <div className="orb fixed top-20 left-10 w-96 h-96 bg-indigo-600/10 pointer-events-none" />
      <div className="orb fixed bottom-20 right-10 w-80 h-80 bg-cyan-500/8 pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="orb fixed top-1/2 left-1/2 w-64 h-64 bg-purple-600/6 pointer-events-none" style={{ animationDelay: '4s' }} />

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="min-h-screen pt-16">
        {renderTab()}
      </main>

      <footer className="border-t border-white/5 py-8 text-center text-white/30 text-sm">
        <p className="mb-1">
          <span className="gradient-text font-semibold">FaceAttend AI</span> · AI-Powered Smart Attendance System
        </p>
        <p>Built with FastAPI · face_recognition (dlib) · React · Tailwind CSS</p>
        <p className="mt-1 text-xs">AI PBL Project · All face data stored securely on local server</p>
      </footer>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#e2e8f0',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#1a1a2e' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
        }}
      />
    </div>
  )
}
