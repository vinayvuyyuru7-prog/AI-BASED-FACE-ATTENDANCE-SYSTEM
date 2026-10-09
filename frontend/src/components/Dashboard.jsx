import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts'
import useStore from '../store/useStore'
import api from '../api/client'

const AVATAR_COLORS = [
  'from-indigo-600 to-purple-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-pink-600 to-rose-600',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
        <div className="text-white/60 mb-1 font-mono text-xs">{label}</div>
        <div className="text-indigo-400 font-bold">{payload[0].value} Present</div>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const {
    students, todayData, weekHistory,
    allStudentsStatus, fetchAllStudentsStatus,
    fetchStudents, fetchTodayAttendance, fetchWeekHistory,
    manualMark,
  } = useStore()

  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchStudents()
    fetchTodayAttendance()
    fetchWeekHistory()
    fetchAllStudentsStatus()
    const id = setInterval(() => {
      fetchTodayAttendance()
      fetchAllStudentsStatus()
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const filtered = allStudentsStatus.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  // Format week history for chart
  const chartData = weekHistory.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
    present: r.present_count,
  }))

  const METRICS = [
    {
      icon: '👥', label: 'Total Students',  val: students.length,
      gradient: 'from-indigo-600 to-purple-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20',
    },
    {
      icon: '✅', label: 'Present Today',   val: todayData?.present ?? 0,
      gradient: 'from-emerald-600 to-teal-600',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
    },
    {
      icon: '❌', label: 'Absent Today',    val: todayData?.absent ?? 0,
      gradient: 'from-red-600 to-orange-600',    bg: 'bg-red-500/10',     border: 'border-red-500/20',
    },
    {
      icon: '📈', label: 'Attendance Rate', val: `${todayData?.percentage ?? 0}%`,
      gradient: 'from-cyan-600 to-blue-600',     bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="section-badge mx-auto w-fit"><span>Analytics</span></div>
        <h2 className="text-4xl font-black text-white mt-4 mb-3">
          Attendance <span className="gradient-text">Dashboard</span>
        </h2>
        <p className="text-white/50 max-w-md mx-auto">
          Comprehensive attendance analytics and history. Refreshes every 30 seconds.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {METRICS.map(({ icon, label, val, gradient, bg, border }) => (
          <div key={label} className={`glass p-5 border ${border} hover:scale-[1.02] transition-transform`}>
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center text-2xl mb-4`}>
              {icon}
            </div>
            <div className={`text-3xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-1`}>{val}</div>
            <div className="text-sm text-white/50">{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="glass p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📅</span> Weekly Attendance Trend
          </h3>
          <span className="text-xs text-white/40 font-mono">Last 7 days</span>
        </div>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">No attendance data yet. Start marking attendance!</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barSize={32}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                axisLine={false} tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }}/>
              <Bar dataKey="present" fill="url(#barGrad)" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="url(#barGrad)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Students table */}
      <div className="glass p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>👤</span> All Students Status
          </h3>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-indigo-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="bg-transparent text-white text-sm outline-none w-36 placeholder-white/30"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Export */}
            <button
              className="btn-outline text-sm py-2"
              onClick={() => window.open('/api/attendance/export', '_blank')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Student', 'Student ID', 'Class', 'Today\'s Status', 'Time', 'Confidence', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs text-white/40 font-medium pb-3 pr-4 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm">
                  {allStudentsStatus.length === 0 ? 'No students registered yet' : 'No results match your search'}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {getInitials(s.name)}
                      </div>
                      <span className="text-white text-sm font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-white/60 text-sm font-mono">{s.student_id}</td>
                  <td className="py-3 pr-4 text-white/60 text-sm">{s.class_name}</td>
                  <td className="py-3 pr-4">
                    {s.status === 'present'
                      ? <span className="status-present">✓ Present</span>
                      : <span className="status-absent">✕ Absent</span>}
                  </td>
                  <td className="py-3 pr-4 text-white/40 text-xs font-mono">{s.time || '—'}</td>
                  <td className="py-3 pr-4 text-white/40 text-xs font-mono">
                    {s.confidence ? `${s.confidence}%` : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    {s.status !== 'present' && (
                      <button
                        className="text-xs px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                        onClick={() => { manualMark(s.id); fetchAllStudentsStatus(); fetchTodayAttendance() }}
                      >
                        Mark Present
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
