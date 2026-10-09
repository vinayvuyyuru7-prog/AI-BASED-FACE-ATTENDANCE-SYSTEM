import React from 'react'
import useStore from '../store/useStore'

const FEATURES = [
  { icon: '🧠', title: 'AI-Powered', desc: 'dlib face_recognition with 128-d face encodings — 99%+ accuracy' },
  { icon: '⚡', title: 'Real-Time', desc: 'Instant face detection and attendance marking via live webcam feed' },
  { icon: '📊', title: 'Analytics', desc: 'Comprehensive attendance dashboard with charts and CSV export' },
  { icon: '🔒', title: 'Secure', desc: 'All face data stored locally on your server — no cloud dependency' },
]

export default function Hero({ setActiveTab }) {
  const { students, todayData } = useStore()

  return (
    <section className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left content */}
          <div className="animate-[fadeIn_0.6s_ease-out]">
            <div className="section-badge">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse-slow" />
              AI · Computer Vision · PBL Project
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] mt-4 mb-6">
              Attendance<br />
              <span className="gradient-text">Reimagined</span><br />
              with Faces
            </h1>

            <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-lg">
              Revolutionary face recognition technology that automatically identifies students and marks attendance in real-time.
              Powered by <span className="text-indigo-400 font-medium">dlib + FastAPI</span> — no cards, no roll calls.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <button className="btn-primary text-base px-8 py-3.5" onClick={() => setActiveTab('register')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Register Student
              </button>
              <button className="btn-outline text-base px-8 py-3.5" onClick={() => setActiveTab('attendance')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                Mark Attendance
              </button>
            </div>

            {/* Live stats */}
            <div className="flex gap-6">
              {[
                { val: students.length, label: 'Registered' },
                { val: todayData?.present ?? 0, label: 'Present Today' },
                { val: todayData ? `${todayData.percentage}%` : '0%', label: 'Attendance Rate' },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-black gradient-text">{val}</div>
                  <div className="text-xs text-white/40 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: animated face scan mockup */}
          <div className="hidden lg:flex justify-center animate-[fadeIn_0.8s_ease-out]">
            <div className="relative w-80 h-80">
              {/* Outer pulse rings */}
              <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping" />
              <div className="absolute inset-4 rounded-full border border-indigo-500/15 animate-ping" style={{ animationDelay: '0.5s' }} />

              {/* Main card */}
              <div className="absolute inset-8 glass rounded-3xl flex flex-col items-center justify-center p-6 shadow-glow-primary">
                <div className="relative w-28 h-28 mb-4">
                  {/* Face outline */}
                  <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
                    <circle cx="50" cy="42" r="28" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
                    <circle cx="40" cy="38" r="4" fill="#6366f1" opacity="0.8"/>
                    <circle cx="60" cy="38" r="4" fill="#6366f1" opacity="0.8"/>
                    <path d="M40 52 Q50 62 60 52" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <circle cx="50" cy="42" r="40" stroke="#06b6d4" strokeWidth="0.5" opacity="0.2" strokeDasharray="3 6"/>
                    {/* Scan corners */}
                    <rect x="14" y="6" width="14" height="2" fill="#6366f1"/>
                    <rect x="14" y="6" width="2" height="14" fill="#6366f1"/>
                    <rect x="72" y="6" width="14" height="2" fill="#6366f1"/>
                    <rect x="84" y="6" width="2" height="14" fill="#6366f1"/>
                    <rect x="14" y="78" width="14" height="2" fill="#6366f1"/>
                    <rect x="14" y="78" width="2" height="14" fill="#6366f1"/>
                    <rect x="72" y="78" width="14" height="2" fill="#6366f1"/>
                    <rect x="84" y="78" width="2" height="14" fill="#6366f1"/>
                  </svg>
                  {/* Scan line */}
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div className="scan-line w-full h-8 bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Scanning...
                </div>
                <div className="text-xs text-white/40 mt-1 font-mono">face_recognition · dlib</div>
              </div>

              {/* Floating student badges */}
              {[
                { initials: 'AS', name: 'Ananya S.', color: 'from-indigo-600 to-purple-600', pos: '-top-4 -left-4', status: 'present' },
                { initials: 'RM', name: 'Rahul M.',  color: 'from-cyan-600 to-blue-600',    pos: '-top-4 -right-4', status: 'present' },
                { initials: 'PK', name: 'Priya K.',  color: 'from-amber-600 to-orange-600', pos: '-bottom-2 left-1/2 -translate-x-1/2', status: 'absent' },
              ].map(({ initials, name, color, pos, status }) => (
                <div key={initials} className={`absolute ${pos} glass px-3 py-2 rounded-xl flex items-center gap-2 animate-[float_3s_ease-in-out_infinite] shadow-lg`}>
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold`}>{initials}</div>
                  <div>
                    <div className="text-xs text-white font-medium">{name}</div>
                    <div className={status === 'present' ? 'status-present' : 'status-absent'}>{status === 'present' ? '✓ Present' : '● Absent'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-7xl mx-auto w-full px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="glass-hover p-5">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="font-semibold text-white mb-1">{title}</div>
              <div className="text-sm text-white/50 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
