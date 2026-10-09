import React, { useEffect, useState } from 'react'
import api from '../api/client'
import clsx from 'clsx'

import useStore from '../store/useStore'

const NAV_ITEMS = [
  { id: 'home',       label: 'Home',       icon: '⌂' },
  { id: 'register',   label: 'Register',   icon: '👤' },
  { id: 'attendance', label: 'Attendance', icon: '📷' },
  { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
  { id: 'admin',      label: 'Admin',      icon: '🛡️' },
]

export default function Navbar({ activeTab, setActiveTab }) {
  const { adminToken, adminProfile } = useStore()
  const [apiStatus, setApiStatus] = useState('checking') // 'ok' | 'error' | 'checking'
  const [scrolled,  setScrolled]  = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        await api.get('/health')
        setApiStatus('ok')
      } catch {
        setApiStatus('error')
      }
    }
    check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={clsx(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-xl' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div>
            <div className="font-bold text-white leading-none">
              FaceAttend<span className="text-indigo-400"> AI</span>
            </div>
            <div className="text-[10px] text-white/40 font-mono leading-none mt-0.5">v1.0 · face_recognition</div>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/[0.08]">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              <span className="text-xs">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Right Status Panel */}
        <div className="flex items-center gap-3 text-xs">
          {adminToken && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span>Admin: {adminProfile?.username || 'Active'}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-2 h-2 rounded-full relative',
              apiStatus === 'ok'       && 'bg-emerald-400 pulse-ring text-emerald-400',
              apiStatus === 'error'    && 'bg-red-400',
              apiStatus === 'checking' && 'bg-yellow-400 animate-pulse'
            )} />
            <span className={clsx(
              'font-mono hidden sm:inline',
              apiStatus === 'ok'    && 'text-emerald-400',
              apiStatus === 'error' && 'text-red-400',
              apiStatus === 'checking' && 'text-yellow-400'
            )}>
              {apiStatus === 'ok'       && 'API Connected'}
              {apiStatus === 'error'    && 'API Offline'}
              {apiStatus === 'checking' && 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}
