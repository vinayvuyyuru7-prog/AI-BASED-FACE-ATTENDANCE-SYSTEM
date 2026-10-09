import React, { useRef, useState, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import toast  from 'react-hot-toast'
import api    from '../api/client'
import useStore from '../store/useStore'

const AVATAR_COLORS = [
  'from-indigo-600 to-purple-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-pink-600 to-rose-600',
]

export default function Attendance() {
  const webcamRef      = useRef(null)
  const intervalRef    = useRef(null)
  const [cameraOn,     setCameraOn]     = useState(false)
  const [recognizing,  setRecognizing]  = useState(false)
  const [lastResult,   setLastResult]   = useState(null)
  const [autoMode,     setAutoMode]     = useState(false)

  const { todayData, fetchTodayAttendance, students, manualMark } = useStore()

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Core recognition function ─────────────────────────────────────────────
  const recognizeFace = useCallback(async () => {
    if (!webcamRef.current || recognizing) return
    const img = webcamRef.current.getScreenshot()
    if (!img) return

    setRecognizing(true)
    try {
      const fd = new FormData()
      fd.append('image', img)
      const { data } = await api.post('/attendance/recognize', fd)

      setLastResult(data)
      if (data.recognized && !data.already_marked) {
        toast.success(data.message, { duration: 3000 })
        fetchTodayAttendance()
      } else if (data.recognized && data.already_marked) {
        toast(data.message, { icon: '⚠️', duration: 2000 })
      }
    } catch (e) {
      console.error('Recognition error', e)
    } finally {
      setRecognizing(false)
    }
  }, [recognizing, fetchTodayAttendance])

  // ── Auto mode: scan every 3 seconds ──────────────────────────────────────
  useEffect(() => {
    if (autoMode && cameraOn) {
      intervalRef.current = setInterval(recognizeFace, 3000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoMode, cameraOn, recognizeFace])

  const stopCamera = () => {
    setCameraOn(false)
    setAutoMode(false)
    setLastResult(null)
    clearInterval(intervalRef.current)
  }

  const presentSet = new Set(todayData?.records?.map(r => r.student_id) ?? [])
  const pct        = todayData?.percentage ?? 0
  const circumference = 2 * Math.PI * 45
  const dashArray  = `${(pct / 100) * circumference} ${circumference}`

  const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="section-badge mx-auto w-fit"><span>Step 02</span></div>
        <h2 className="text-4xl font-black text-white mt-4 mb-3">
          Mark <span className="gradient-text">Attendance</span>
        </h2>
        <p className="text-white/50 max-w-md mx-auto">
          Real-time face recognition — point the camera at a student and the system auto-identifies them.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── Camera panel (2 cols) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass p-6">
            {/* Camera header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm text-white/70 font-medium">{cameraOn ? 'Live Feed' : 'Camera Off'}</span>
                </div>
                {cameraOn && (
                  <button
                    onClick={() => setAutoMode(m => !m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      autoMode
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {autoMode ? '🔴 Auto ON' : '⭕ Auto OFF'}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {!cameraOn ? (
                  <button className="btn-success text-sm" onClick={() => setCameraOn(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                    Start Camera
                  </button>
                ) : (
                  <button className="btn-danger text-sm" onClick={stopCamera}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    Stop
                  </button>
                )}
              </div>
            </div>

            {/* Video area */}
            <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/5" style={{ aspectRatio: '16/9' }}>
              {cameraOn ? (
                <>
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.9}
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="scan-line w-full h-16 bg-gradient-to-b from-transparent via-indigo-500/15 to-transparent" />
                    </div>
                    <div className="absolute inset-0 border-[1px] border-indigo-500/10 m-8 rounded-xl">
                      <div className="scan-corner tl" /><div className="scan-corner tr" />
                      <div className="scan-corner bl" /><div className="scan-corner br" />
                    </div>
                    {recognizing && (
                      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                        <svg className="w-3 h-3 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span className="text-xs text-indigo-400 font-mono">Recognizing...</span>
                      </div>
                    )}
                    {autoMode && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-3 py-1">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                        <span className="text-xs text-indigo-400 font-mono">Auto scanning every 3s</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                    <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  <p className="text-sm">Start camera to begin face recognition</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-4">
              <button
                className="btn-primary flex-1 py-3"
                onClick={recognizeFace}
                disabled={!cameraOn || recognizing}
              >
                {recognizing ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Recognizing...</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Scan Face Now</>
                )}
              </button>
            </div>
          </div>

          {/* Recognition result */}
          {lastResult && (
            <div className={`glass p-5 border animate-[slideUp_0.4s_ease-out] ${
              lastResult.recognized
                ? lastResult.already_marked ? 'border-yellow-500/30' : 'border-emerald-500/30'
                : 'border-red-500/30'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 ${
                  lastResult.recognized
                    ? lastResult.already_marked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {lastResult.recognized
                    ? lastResult.already_marked ? '⚠️' : '✅'
                    : '❓'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">
                    {lastResult.recognized ? lastResult.student?.name : 'Unknown Person'}
                  </div>
                  <div className="text-white/50 text-sm">{lastResult.message}</div>
                  {lastResult.recognized && (
                    <div className="flex gap-3 mt-1 text-xs font-mono">
                      <span className="text-indigo-400">ID: {lastResult.student?.student_id}</span>
                      <span className="text-white/40">Confidence: {lastResult.confidence}%</span>
                      {lastResult.time && <span className="text-white/40">at {lastResult.time}</span>}
                    </div>
                  )}
                </div>
                {lastResult.confidence && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black gradient-text">{lastResult.confidence}%</div>
                    <div className="text-xs text-white/40">Match</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-6">
          {/* Summary ring */}
          <div className="glass p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Today's Summary
            </h3>
            <p className="text-xs text-white/40 mb-4 font-mono">{today}</p>

            <div className="flex items-center justify-center mb-5">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e1b4b" strokeWidth="8"/>
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke="url(#attGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={dashArray}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="attGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1"/>
                      <stop offset="100%" stopColor="#06b6d4"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-black gradient-text">{pct}%</div>
                  <div className="text-xs text-white/40">Present</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                <div className="text-xl font-bold text-emerald-400">{todayData?.present ?? 0}</div>
                <div className="text-xs text-white/40">Present</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                <div className="text-xl font-bold text-red-400">{todayData?.absent ?? 0}</div>
                <div className="text-xs text-white/40">Absent</div>
              </div>
              <div className="bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20">
                <div className="text-xl font-bold text-indigo-400">{todayData?.total ?? 0}</div>
                <div className="text-xs text-white/40">Total</div>
              </div>
            </div>
          </div>

          {/* All students with status */}
          <div className="glass p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>👥</span> All Students
              </h3>
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={() => {
                  window.open('/api/attendance/export', '_blank')
                }}
              >
                Export CSV ↗
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {students.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm">No students registered</div>
              ) : students.map((s, i) => {
                const isPresent = presentSet.has(s.id)
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/5 transition-colors group border border-white/5">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {getInitials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{s.name}</div>
                      <div className="text-white/40 text-[10px] font-mono">{s.student_id}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPresent ? (
                        <span className="status-present">✓ Present</span>
                      ) : (
                        <button
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-indigo-400 transition-all"
                          onClick={() => manualMark(s.id)}
                          title="Manual mark"
                        >
                          Mark
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
