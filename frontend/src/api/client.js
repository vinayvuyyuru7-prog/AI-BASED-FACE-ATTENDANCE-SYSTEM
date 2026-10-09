import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Request interceptor to attach bearer token if logged in
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('face-attend-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.adminToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
  } catch (e) {
    // ignore
  }
  return config
})

// Response interceptor for global error logging
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.response?.data || err.message)
    return Promise.reject(err)
  }
)

export default api
