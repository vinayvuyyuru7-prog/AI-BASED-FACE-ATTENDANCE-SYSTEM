import React, { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import toast  from 'react-hot-toast'
import api    from '../api/client'
import useStore from '../store/useStore'

export default function Register() {
  const webcamRef   = useRef(null)
  const [cameraOn,  setCameraOn]   = useState(false)
  const [captured,  setCaptured]   = useState(null)   // base64 screenshot
  const [loading,   setLoading]    = useState(false)
  const [facesDetected, setFacesDetected] = useState(null)

  const { students, fetchStudents, deleteStudent, loadingStudents } = useStore()

  const [form, setForm] = useState({ name: '', student_id: '', class_name: '', email: '' })

  // Capture frame from webcam
  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot()
    if (!img) { toast.error('Camera not ready'); return }
    setCaptured(img)
    setFacesDetected(null)
    toast.success('Face captured! Fill the form and register.')
  }, [webcamRef])

  const retake = () => { setCaptured(null); setFacesDetected(null) }

  const handleRegister = async () => {
    if (!form.name.trim())       return toast.error('Enter student name')
    if (!form.student_id.trim()) return toast.error('Enter student ID')
    if (!form.class_name.trim()) return toast.error('Enter class / section')
    if (!captured)               return toast.error('Capture face photo first')

    const fd = new FormData()
    fd.append('name',       form.name.trim())
    fd.append('student_id', form.student_id.trim())
    fd.append('class_name', form.class_name.trim())
    fd.append('email',      form.email.trim())
    fd.append('image',      captured)

    setLoading(true)
    try {
      const { data } = await api.post('/students/register', fd)
      toast.success(data.message)
      setForm({ name: '', student_id: '', class_name: '', email: '' })
      setCaptured(null)
      fetchStudents()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const AVATAR_COLORS = [
    'from-indigo-600 to-purple-600',
    'from-cyan-600 to-blue-600',
    'from-emerald-600 to-teal-600',
    'from-amber-600 to-orange-600',
    'from-pink-600 to-rose-600',
  ]

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="section-badge mx-auto w-fit"><span>Step 01</span></div>
        <h2 className="text-4xl font-black text-white mt-4 mb-3">
          Register <span className="gradient-text">Student</span>
        </h2>
        <p className="text-white/50 max-w-md mx-auto">
          Capture a student's face to enroll them. dlib will extract a unique 128-dimensional face encoding.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* ── Camera panel ── */}
        <div className="glass p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-sm text-white/70 font-medium">{cameraOn ? 'Camera Active' : 'Camera Off'}</span>
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
                <button className="btn-danger text-sm" onClick={() => { setCameraOn(false); setCaptured(null) }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Video / preview area */}
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/5" style={{ aspectRatio: '4/3' }}>
            {cameraOn && !captured && (
              <>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.92}
                  className="w-full h-full object-cover"
                  videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="scan-line w-full h-12 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />
                  </div>
                  <div className="absolute inset-6 border border-indigo-500/30 rounded-xl">
                    <div className="scan-corner tl" /><div className="scan-corner tr" />
                    <div className="scan-corner bl" /><div className="scan-corner br" />
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-xs text-indigo-400 font-mono">
                    Position face within frame
                  </div>
                </div>
              </>
            )}

            {captured && (
              <div className="relative w-full h-full">
                <img src={captured} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl px-4 py-2 text-emerald-400 font-semibold">
                    ✓ Face Captured
                  </div>
                </div>
              </div>
            )}

            {!cameraOn && !captured && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path d="M23 7 16 12 23 17V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <p className="text-sm">Start camera to capture face</p>
              </div>
            )}
          </div>

          {/* Capture / Retake */}
          <div className="flex gap-3">
            {!captured ? (
              <button
                className="btn-primary flex-1 py-3"
                onClick={capture}
                disabled={!cameraOn}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>
                </svg>
                {cameraOn ? 'Capture Face' : 'Start camera first'}
              </button>
            ) : (
              <button className="btn-outline flex-1 py-3" onClick={retake}>
                ↩ Retake Photo
              </button>
            )}
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="flex flex-col gap-6">
          <div className="glass p-6">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <span>📋</span> Student Details
            </h3>
            <div className="space-y-4">
              {[
                { key: 'name',       label: 'Full Name *',         placeholder: 'e.g. Ananya Sharma',    type: 'text' },
                { key: 'student_id', label: 'Student ID *',        placeholder: 'e.g. CS2024001',        type: 'text' },
                { key: 'class_name', label: 'Class / Section *',   placeholder: 'e.g. CSE-A Sem 5',     type: 'text' },
                { key: 'email',      label: 'Email (optional)',     placeholder: 'student@college.edu',   type: 'email' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm text-white/60 mb-1.5 font-medium">{label}</label>
                  <input
                    type={type}
                    className="input-field"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-primary w-full mt-6 py-3.5 text-base"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Registering...</>
              ) : (
                <><span>👤+</span> Register Student</>
              )}
            </button>
          </div>

          {/* Students list */}
          <div className="glass p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><span>👥</span> Registered Students</h3>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-sm font-medium border border-indigo-500/30">
                {students.length}
              </span>
            </div>

            {loadingStudents ? (
              <div className="text-center py-8 text-white/40 text-sm">Loading...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm flex flex-col items-center gap-2">
                <span className="text-4xl">👥</span>
                <p>No students registered yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {students.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/5 group">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {getInitials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{s.name}</div>
                      <div className="text-white/40 text-xs font-mono">{s.student_id} · {s.class_name}</div>
                    </div>
                    <button
                      onClick={() => deleteStudent(s.id, s.name)}
                      className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all p-1"
                      title="Delete student"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
