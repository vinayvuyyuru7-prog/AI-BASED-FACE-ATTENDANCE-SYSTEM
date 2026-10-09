import React, { useState, useEffect } from 'react'
import api from '../api/client'
import useStore from '../store/useStore'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Download,
  Search,
  Filter,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { adminProfile, adminLogout } = useStore()

  // Tabs: 'daily' | 'monthly' | 'student-detail'
  const [activeTab, setActiveTab] = useState('daily')

  // ── Daily Tracking State ──
  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [dailyData, setDailyData] = useState(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailySearch, setDailySearch] = useState('')
  const [dailyDeptFilter, setDailyDeptFilter] = useState('ALL')

  // ── Monthly Calculation State ──
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlySearch, setMonthlySearch] = useState('')

  // Fetch Daily Attendance
  const fetchDaily = async (date) => {
    setDailyLoading(true)
    try {
      const { data } = await api.get(`/admin/daily-report?report_date=${date}`)
      // Ensure schema normalization for rendering
      const normalizedSummary = data.summary || {
        total_students: data.total || 0,
        present_count: data.present || 0,
        absent_count: data.absent || 0,
        attendance_rate: data.percentage || 0,
      }
      const normalizedStudents = (data.students || data.records || []).map(s => ({
        ...s,
        department: s.department || s.class_name || 'N/A',
        year: s.year || 'Sem',
        status: (s.status || '').toUpperCase(),
      }))
      setDailyData({ summary: normalizedSummary, students: normalizedStudents })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load daily attendance')
    } finally {
      setDailyLoading(false)
    }
  }

  // Fetch Monthly Calculation
  const fetchMonthly = async (year, month) => {
    setMonthlyLoading(true)
    try {
      const { data } = await api.get(`/admin/monthly-report?year=${year}&month=${month}`)
      const normalizedStudents = (data.students || data.report || []).map(s => ({
        ...s,
        department: s.department || s.class_name || 'N/A',
        year: s.year || 'Sem',
        days_present: s.days_present ?? s.present_days ?? 0,
        total_working_days: s.total_working_days ?? s.working_days ?? 0,
        attendance_percentage: s.attendance_percentage ?? s.percentage ?? 0,
      }))
      setMonthlyData({
        total_working_days: data.total_working_days ?? data.working_days ?? 0,
        average_class_attendance: data.average_class_attendance ?? data.avg_percentage ?? 0,
        month_name: data.month_name || '',
        students: normalizedStudents,
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to calculate monthly attendance')
    } finally {
      setMonthlyLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDaily(selectedDate)
    } else if (activeTab === 'monthly') {
      fetchMonthly(selectedYear, selectedMonth)
    }
  }, [activeTab, selectedDate, selectedYear, selectedMonth])

  // Shift date backward/forward
  const shiftDate = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/admin/export-monthly?year=${selectedYear}&month=${selectedMonth}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })
      link.setAttribute('download', `Attendance_Report_${monthName}_${selectedYear}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('CSV Report Downloaded!')
    } catch (e) {
      toast.error('Failed to export CSV')
    }
  }

  // Filter daily students
  const filteredDailyStudents = (dailyData?.students || []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(dailySearch.toLowerCase()) ||
                          s.student_id.toLowerCase().includes(dailySearch.toLowerCase())
    const matchesDept = dailyDeptFilter === 'ALL' || s.department === dailyDeptFilter
    return matchesSearch && matchesDept
  })

  // Filter monthly students
  const filteredMonthlyStudents = (monthlyData?.students || []).filter(s => {
    return s.name.toLowerCase().includes(monthlySearch.toLowerCase()) ||
           s.student_id.toLowerCase().includes(monthlySearch.toLowerCase()) ||
           (s.department || '').toLowerCase().includes(monthlySearch.toLowerCase())
  })

  const departments = Array.from(new Set((dailyData?.students || []).map(s => s.department).filter(Boolean)))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Admin Header & Welcome Banner */}
      <div className="glass-card p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20 shadow-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Administrator Hub</h1>
              <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Logged in as <strong className="text-white">{adminProfile?.full_name || adminProfile?.username || 'Administrator'}</strong> ({adminProfile?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={adminLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'daily'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Day-to-Day Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'monthly'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Monthly Calculation (%)</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: DAY-TO-DAY TRACKER */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
            {/* Date Picker & Prev/Next */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => shiftDate(-1)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1 md:w-48">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={dailySearch}
                  onChange={(e) => setDailySearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={dailyDeptFilter}
                onChange={(e) => setDailyDeptFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL" className="bg-slate-900">All Depts</option>
                {departments.map(d => (
                  <option key={d} value={d} className="bg-slate-900">{d}</option>
                ))}
              </select>

              <button
                onClick={() => fetchDaily(selectedDate)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${dailyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-1">
                <span>TOTAL REGISTERED</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{dailyData?.summary?.total_students || 0}</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-between text-emerald-400/80 text-xs font-semibold mb-1">
                <span>PRESENT TODAY</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{dailyData?.summary?.present_count || 0}</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="flex items-center justify-between text-red-400/80 text-xs font-semibold mb-1">
                <span>ABSENT TODAY</span>
                <UserX className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{dailyData?.summary?.absent_count || 0}</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <div className="flex items-center justify-between text-cyan-400/80 text-xs font-semibold mb-1">
                <span>ATTENDANCE RATE</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {dailyData?.summary?.attendance_rate || 0}%
              </div>
            </div>
          </div>

          {/* Student Daily Status List Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Attendance Log for</span>
                <span className="text-indigo-400 font-mono underline">{selectedDate}</span>
              </h3>
              <span className="text-xs text-white/50">{filteredDailyStudents.length} Students listed</span>
            </div>

            {dailyLoading ? (
              <div className="py-12 text-center text-white/40 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading attendance records...
              </div>
            ) : filteredDailyStudents.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-sm">
                No registered students found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white/70">
                  <thead className="bg-white/5 text-white/50 uppercase font-mono tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">ID / Roll No</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Check-in Time</th>
                      <th className="p-3">AI Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredDailyStudents.map((s) => (
                      <tr key={s.student_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              className="w-8 h-8 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                              {s.name[0]}
                            </div>
                          )}
                          <span className="font-semibold text-white">{s.name}</span>
                        </td>
                        <td className="p-3 font-mono text-white/60">{s.student_id}</td>
                        <td className="p-3">{s.department} ({s.year})</td>
                        <td className="p-3">
                          {s.status === 'PRESENT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                              <XCircle className="w-3.5 h-3.5" /> Absent
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {s.time ? (
                            <span className="flex items-center gap-1 text-white">
                              <Clock className="w-3 h-3 text-indigo-400" />
                              {s.time}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {s.confidence ? (
                            <span className="text-emerald-400 font-semibold">{s.confidence}%</span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MONTHLY CALCULATOR */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
            {/* Year & Month Selection */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/60">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m} className="bg-slate-900">
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/60">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y} className="bg-slate-900">{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search & Export Button */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or dept..."
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {/* Monthly Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-xl border border-white/10">
              <div className="text-xs text-white/50 font-semibold mb-1">WORKING DAYS IN MONTH</div>
              <div className="text-2xl font-bold text-white">{monthlyData?.total_working_days || 0} Days</div>
              <p className="text-[11px] text-white/40 mt-1">Excludes weekends and future dates</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
              <div className="text-xs text-indigo-400 font-semibold mb-1">AVERAGE CLASS ATTENDANCE</div>
              <div className="text-2xl font-bold text-indigo-400">
                {monthlyData?.average_class_attendance || 0}%
              </div>
              <p className="text-[11px] text-indigo-300/50 mt-1">Calculated across all students</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="text-xs text-amber-400 font-semibold mb-1">LOW ATTENDANCE WARNINGS (&lt;75%)</div>
              <div className="text-2xl font-bold text-amber-400">
                {(monthlyData?.students || []).filter(s => s.attendance_percentage < 75).length} Students
              </div>
              <p className="text-[11px] text-amber-300/50 mt-1">Requires immediate follow-up</p>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Monthly Percentage Calculations ({monthlyData?.month_name} {selectedYear})
              </h3>
              <span className="text-xs text-white/50">{filteredMonthlyStudents.length} Students</span>
            </div>

            {monthlyLoading ? (
              <div className="py-12 text-center text-white/40 text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                Calculating monthly percentages...
              </div>
            ) : filteredMonthlyStudents.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-sm">
                No monthly data found for this selection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white/70">
                  <thead className="bg-white/5 text-white/50 uppercase font-mono tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">ID / Roll</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Days Present</th>
                      <th className="p-3">Working Days</th>
                      <th className="p-3">Monthly Percentage</th>
                      <th className="p-3">Eligibility Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMonthlyStudents.map((s) => {
                      const pct = s.attendance_percentage
                      let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      let label = 'Eligible (High)'
                      if (pct < 60) {
                        badgeColor = 'bg-red-500/20 text-red-300 border-red-500/30'
                        label = 'Critical (<60%)'
                      } else if (pct < 75) {
                        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        label = 'Warning (<75%)'
                      }

                      return (
                        <tr key={s.student_id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                              {s.name[0]}
                            </div>
                            <span className="font-semibold text-white">{s.name}</span>
                          </td>
                          <td className="p-3 font-mono text-white/60">{s.student_id}</td>
                          <td className="p-3">{s.department} ({s.year})</td>
                          <td className="p-3 font-mono text-white font-semibold">{s.days_present}</td>
                          <td className="p-3 font-mono text-white/60">{s.total_working_days}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    pct >= 75 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-white">{pct}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
                              {label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
