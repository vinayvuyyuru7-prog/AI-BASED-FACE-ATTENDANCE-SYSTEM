import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/client'
import toast from 'react-hot-toast'

const useStore = create(
  persist(
    (set, get) => ({
      // ── Admin Auth ──────────────────────────────────────────────────────────
      adminToken:   null,
      adminProfile: null,

      adminLogin: async (username, password) => {
        const form = new FormData()
        form.append('username', username)
        form.append('password', password)
        try {
          const { data } = await api.post('/admin/login', form)
          set({ adminToken: data.access_token })
          api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
          // Fetch profile
          const me = await api.get('/admin/me')
          set({ adminProfile: me.data })
          toast.success(`Welcome, ${me.data.full_name}!`)
          return true
        } catch (e) {
          toast.error(e.response?.data?.detail || 'Invalid credentials')
          return false
        }
      },

      adminLogout: () => {
        set({ adminToken: null, adminProfile: null })
        delete api.defaults.headers.common['Authorization']
        toast('Logged out', { icon: '👋' })
      },

      restoreAdminAuth: () => {
        const token = get().adminToken
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      },

      // ── Students ─────────────────────────────────────────────────────────────
      students: [],
      loadingStudents: false,

      fetchStudents: async () => {
        set({ loadingStudents: true })
        try {
          const { data } = await api.get('/students')
          set({ students: data.students })
        } catch { toast.error('Failed to load students') }
        finally { set({ loadingStudents: false }) }
      },

      deleteStudent: async (id, name) => {
        try {
          await api.delete(`/students/${id}`)
          toast.success(`${name} removed`)
          get().fetchStudents()
          get().fetchTodayAttendance()
        } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed') }
      },

      // ── Attendance ────────────────────────────────────────────────────────────
      todayData:        null,
      loadingAttendance: false,
      weekHistory:      [],

      fetchTodayAttendance: async () => {
        set({ loadingAttendance: true })
        try {
          const { data } = await api.get('/attendance/today')
          set({ todayData: data })
        } catch (e) { console.error('Attendance fetch', e) }
        finally { set({ loadingAttendance: false }) }
      },

      fetchWeekHistory: async () => {
        try {
          const { data } = await api.get('/attendance/history?days=7')
          set({ weekHistory: data.history })
        } catch (e) { console.error('History', e) }
      },

      manualMark: async (studentId) => {
        const form = new FormData()
        form.append('student_db_id', studentId)
        try {
          const { data } = await api.post('/attendance/manual', form)
          if (data.success) { toast.success(data.message); get().fetchTodayAttendance() }
          else toast(data.message, { icon: '⚠️' })
        } catch (e) { toast.error(e.response?.data?.detail || 'Manual mark failed') }
      },

      // ── All-students status ───────────────────────────────────────────────────
      allStudentsStatus: [],

      fetchAllStudentsStatus: async () => {
        try {
          const { data } = await api.get('/attendance/all-students-status')
          set({ allStudentsStatus: data.students })
        } catch (e) { console.error(e) }
      },
    }),
    {
      name:    'face-attend-store',
      partialize: (state) => ({ adminToken: state.adminToken, adminProfile: state.adminProfile }),
    }
  )
)

export default useStore
