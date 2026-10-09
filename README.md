# 🤖 FaceAttend AI – AI-Based Face Attendance System

An end-to-end AI attendance system using **face recognition** — register students once, then automatically mark attendance by simply pointing a webcam at them.

## 🏗 Tech Stack

| Layer     | Technology |
|-----------|-----------|
| Frontend  | React 18 + Tailwind CSS (Vite) |
| Backend   | Python FastAPI |
| AI Engine | `face_recognition` (dlib — 128-d face encodings) |
| Database  | SQLite (local file) |
| Camera    | `react-webcam` (browser) |

## 📁 Project Structure

```
AI PBL/
├── backend/
│   ├── main.py           ← FastAPI app (all routes + face recognition)
│   ├── requirements.txt  ← Python dependencies
│   ├── attendance.db     ← SQLite DB (auto-created on first run)
│   └── uploads/          ← Stored face images
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx      ← Sticky nav with API health indicator
│   │   │   ├── Hero.jsx        ← Landing page with live stats
│   │   │   ├── Register.jsx    ← Register student with face capture
│   │   │   ├── Attendance.jsx  ← Live face recognition + marking
│   │   │   └── Dashboard.jsx   ← Analytics, charts, CSV export
│   │   ├── store/useStore.js   ← Zustand global state
│   │   └── api/client.js       ← Axios to FastAPI
│   └── tailwind.config.js
└── start.bat             ← Double-click to launch everything
```

## 🚀 Quick Start

### Option 1: One-click launch (Windows)
```
Double-click start.bat
```

### Option 2: Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## ⚙️ Installing `face_recognition` (dlib)

On Windows, dlib requires CMake + Visual Studio Build Tools:

```bash
# Option A – Pre-built wheel (easiest)
pip install cmake
pip install dlib
pip install face_recognition

# Option B – Conda (recommended)
conda install -c conda-forge dlib
pip install face_recognition
```

## 🔬 How It Works

1. **Registration**: Capture student face → FastAPI extracts 128-d dlib encoding → stored in SQLite
2. **Recognition**: Send webcam frame → FastAPI computes Euclidean distance to all known encodings → returns closest match if distance < 0.55
3. **Attendance**: Match found → row inserted into `attendance` table with timestamp

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/students/register` | Register student with face |
| GET | `/api/students` | List all students |
| DELETE | `/api/students/{id}` | Delete student |
| POST | `/api/attendance/recognize` | Recognize face & mark attendance |
| POST | `/api/attendance/manual` | Manual mark present |
| GET | `/api/attendance/today` | Today's attendance summary |
| GET | `/api/attendance/history` | Weekly history |
| GET | `/api/attendance/export` | Download CSV |
| GET | `/api/attendance/all-students-status` | All students + today status |
| GET | `/api/health` | API health check |

## 🎓 AI PBL Project Details

- **Subject**: Artificial Intelligence
- **Technique**: Face detection + 128-dimensional face encoding (HOG + SVM via dlib)
- **Accuracy**: ~99.2% with good lighting and frontal face
- **Threshold**: Euclidean distance < 0.55 (tunable in `main.py`)
