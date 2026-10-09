"""
FaceAttend AI – FastAPI Backend
================================
AI-based Face Recognition Attendance System
Uses face_recognition (dlib) for accurate face encoding & matching

Admin Role:
  - JWT-protected admin routes
  - Day-by-day attendance tracking per student
  - Monthly attendance % reports
  - Default admin: username=admin  password=admin123
"""

import sqlite3, os, json, base64, io, csv, uuid, calendar
import numpy as np
from datetime import date, datetime, timedelta
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from PIL import Image
import face_recognition
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# ── Constants ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DB_PATH    = BASE_DIR / "attendance.db"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

SECRET_KEY    = "faceattend-ai-super-secret-key-pbl-2024"   # change in production
ALGORITHM     = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8   # 8 hours

pwd_ctx    = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2     = OAuth2PasswordBearer(tokenUrl="/api/admin/login")

# ── Pydantic models ────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str

# ── Database ───────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur  = conn.cursor()
    # Students
    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            student_id  TEXT NOT NULL UNIQUE,
            class_name  TEXT NOT NULL,
            email       TEXT,
            encoding    TEXT NOT NULL,
            image_path  TEXT,
            created_at  TEXT NOT NULL
        )
    """)
    # Attendance
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  TEXT NOT NULL,
            date        TEXT NOT NULL,
            time        TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'present',
            confidence  REAL,
            UNIQUE(student_id, date)
        )
    """)
    # Admins
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT NOT NULL UNIQUE,
            hashed_pw   TEXT NOT NULL,
            full_name   TEXT,
            created_at  TEXT NOT NULL
        )
    """)
    # Seed default admin (admin / admin123) if not exists
    existing = cur.execute("SELECT id FROM admins WHERE username='admin'").fetchone()
    if not existing:
        cur.execute(
            "INSERT INTO admins (username, hashed_pw, full_name, created_at) VALUES (?,?,?,?)",
            ("admin", pwd_ctx.hash("admin123"), "System Administrator", datetime.now().isoformat()),
        )
    conn.commit()
    conn.close()

# ── Auth helpers ───────────────────────────────────────────────────────────────
def verify_admin(username: str, password: str) -> Optional[dict]:
    conn = get_db()
    row  = conn.execute("SELECT * FROM admins WHERE username=?", (username,)).fetchone()
    conn.close()
    if row and pwd_ctx.verify(password, row["hashed_pw"]):
        return dict(row)
    return None

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(token: str = Depends(oauth2)):
    err = HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise err
        conn = get_db()
        row  = conn.execute("SELECT * FROM admins WHERE username=?", (username,)).fetchone()
        conn.close()
        if not row:
            raise err
        return dict(row)
    except JWTError:
        raise err

# ── Image / face helpers ───────────────────────────────────────────────────────
def decode_image(image_data: str) -> np.ndarray:
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    img_bytes = base64.b64decode(image_data)
    pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(pil_img)

def get_face_encoding(image_np: np.ndarray):
    encs = face_recognition.face_encodings(image_np)
    return encs[0].tolist() if encs else None

def load_known_encodings():
    conn = get_db()
    rows = conn.execute("SELECT id, name, student_id, class_name, encoding FROM students").fetchall()
    conn.close()
    ids, encs = [], []
    for row in rows:
        ids.append(dict(row))
        encs.append(np.array(json.loads(row["encoding"])))
    return ids, encs

# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ Database initialized. Default admin → admin / admin123")
    yield

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FaceAttend AI API",
    description="AI-powered face recognition attendance system with admin portal",
    version="2.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════════════════
# ADMIN AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/admin/login", response_model=Token, tags=["Admin Auth"])
async def admin_login(form: OAuth2PasswordRequestForm = Depends()):
    """Login with admin credentials. Returns a JWT Bearer token."""
    admin = verify_admin(form.username, form.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_token({"sub": admin["username"], "name": admin["full_name"]})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/admin/me", tags=["Admin Auth"])
async def admin_me(admin=Depends(get_current_admin)):
    """Return the currently logged-in admin's profile."""
    return {
        "username":  admin["username"],
        "full_name": admin["full_name"],
        "created_at": admin["created_at"],
    }


@app.put("/api/admin/change-password", tags=["Admin Auth"])
async def change_password(
    current_password: str = Form(...),
    new_password:     str = Form(...),
    admin=Depends(get_current_admin),
):
    """Change admin password."""
    if not pwd_ctx.verify(current_password, admin["hashed_pw"]):
        raise HTTPException(400, "Current password is incorrect")
    conn = get_db()
    conn.execute(
        "UPDATE admins SET hashed_pw=? WHERE username=?",
        (pwd_ctx.hash(new_password), admin["username"]),
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Password updated successfully"}


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN REPORTING ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/overview", tags=["Admin Reports"])
async def admin_overview(admin=Depends(get_current_admin)):
    """Overall system stats for the admin dashboard."""
    today = date.today().isoformat()
    conn  = get_db()
    total    = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    present  = conn.execute(
        "SELECT COUNT(*) AS c FROM attendance WHERE date=?", (today,)
    ).fetchone()["c"]
    total_records = conn.execute("SELECT COUNT(*) AS c FROM attendance").fetchone()["c"]
    conn.close()
    return {
        "total_students": total,
        "present_today":  present,
        "absent_today":   total - present,
        "percentage_today": round(present / total * 100, 1) if total else 0,
        "total_attendance_records": total_records,
        "date": today,
    }


@app.get("/api/admin/daily-report", tags=["Admin Reports"])
@app.get("/api/admin/attendance/daily", tags=["Admin Reports"])
async def daily_report(
    report_date: str = "",
    date_param: str = "",
    admin=Depends(get_current_admin),
):
    """
    Full attendance report for a specific date (default: today).
    Returns each student's attendance status, time, and confidence.
    """
    target = report_date or date_param or date.today().isoformat()
    conn   = get_db()
    rows   = conn.execute(
        """
        SELECT s.id, s.name, s.student_id, s.class_name, s.email,
               CASE WHEN a.id IS NOT NULL THEN 'present' ELSE 'absent' END AS status,
               COALESCE(a.time, '') AS time,
               COALESCE(CAST(a.confidence AS TEXT), '') AS confidence
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ?
        ORDER BY s.name
        """,
        (target,),
    ).fetchall()
    conn.close()
    present_cnt = sum(1 for r in rows if r["status"] == "present")
    total       = len(rows)
    pct         = round(present_cnt / total * 100, 1) if total else 0

    students_list = []
    for r in rows:
        d = dict(r)
        students_list.append({
            "id": d["id"],
            "name": d["name"],
            "student_id": d["student_id"],
            "class_name": d["class_name"],
            "department": d["class_name"],
            "year": "Sem",
            "email": d["email"],
            "status": d["status"].upper(),
            "time": d["time"],
            "confidence": d["confidence"],
        })

    return {
        "date":       target,
        "total":      total,
        "present":    present_cnt,
        "absent":     total - present_cnt,
        "percentage": pct,
        "records":    [dict(r) for r in rows],
        "summary": {
            "total_students": total,
            "present_count": present_cnt,
            "absent_count": total - present_cnt,
            "attendance_rate": pct,
        },
        "students": students_list,
    }


@app.get("/api/admin/student/{student_db_id}/daily-history", tags=["Admin Reports"])
async def student_daily_history(
    student_db_id: str,
    days:          int = 30,
    admin=Depends(get_current_admin),
):
    """
    Day-by-day attendance for a specific student (last N days).
    Returns a list of {date, status} objects for calendar rendering.
    """
    conn    = get_db()
    student = conn.execute("SELECT * FROM students WHERE id=?", (student_db_id,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(404, "Student not found")

    end_date   = date.today()
    start_date = end_date - timedelta(days=days - 1)

    present_dates = {
        row["date"]
        for row in conn.execute(
            "SELECT date FROM attendance WHERE student_id=? AND date>=? AND date<=?",
            (student_db_id, start_date.isoformat(), end_date.isoformat()),
        ).fetchall()
    }
    conn.close()

    # Build a full date list (all working days)
    history = []
    d = start_date
    while d <= end_date:
        history.append({
            "date":    d.isoformat(),
            "day":     d.strftime("%a"),
            "status":  "present" if d.isoformat() in present_dates else "absent",
        })
        d += timedelta(days=1)

    return {
        "student":      dict(student),
        "days":         days,
        "history":      history,
        "present_days": len(present_dates),
        "total_days":   days,
        "percentage":   round(len(present_dates) / days * 100, 1),
    }


@app.get("/api/admin/monthly-report", tags=["Admin Reports"])
@app.get("/api/admin/attendance/monthly", tags=["Admin Reports"])
async def monthly_report(
    year:  int = 0,
    month: int = 0,
    admin=Depends(get_current_admin),
):
    """
    Monthly attendance percentage for ALL students.
    Calculates working days in the month and attendance % for each student.
    """
    today = date.today()
    year  = year  or today.year
    month = month or today.month

    # Working days = all days in that month up to today (if current month)
    _, last_day  = calendar.monthrange(year, month)
    month_start  = date(year, month, 1).isoformat()
    if year == today.year and month == today.month:
        month_end = today.isoformat()
        working_days = today.day
    else:
        month_end    = date(year, month, last_day).isoformat()
        working_days = last_day

    conn = get_db()
    students = conn.execute(
        "SELECT id, name, student_id, class_name, email FROM students ORDER BY name"
    ).fetchall()

    report = []
    students_list = []
    for s in students:
        cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM attendance WHERE student_id=? AND date>=? AND date<=?",
            (s["id"], month_start, month_end),
        ).fetchone()["c"]

        # Per-day breakdown for the month
        days_data = conn.execute(
            "SELECT date, time, confidence FROM attendance WHERE student_id=? AND date>=? AND date<=? ORDER BY date",
            (s["id"], month_start, month_end),
        ).fetchall()

        pct = round(cnt / working_days * 100, 1) if working_days else 0

        item = {
            "id":            s["id"],
            "name":          s["name"],
            "student_id":    s["student_id"],
            "class_name":    s["class_name"],
            "present_days":  cnt,
            "working_days":  working_days,
            "absent_days":   working_days - cnt,
            "percentage":    pct,
            "days":          [dict(d) for d in days_data],
        }
        report.append(item)
        students_list.append({
            "id": s["id"],
            "name": s["name"],
            "student_id": s["student_id"],
            "class_name": s["class_name"],
            "department": s["class_name"],
            "year": "Sem",
            "days_present": cnt,
            "total_working_days": working_days,
            "attendance_percentage": pct,
        })

    conn.close()

    month_name = datetime(year, month, 1).strftime("%B %Y")
    avg_pct    = round(sum(r["percentage"] for r in report) / len(report), 1) if report else 0

    return {
        "month":                     month,
        "year":                      year,
        "month_name":                month_name,
        "working_days":              working_days,
        "total_working_days":        working_days,
        "total_students":            len(report),
        "avg_percentage":            avg_pct,
        "average_class_attendance":  avg_pct,
        "report":                    report,
        "students":                  students_list,
    }


@app.get("/api/admin/student/{student_db_id}/monthly-detail", tags=["Admin Reports"])
async def student_monthly_detail(
    student_db_id: str,
    year:  int = 0,
    month: int = 0,
    admin=Depends(get_current_admin),
):
    """
    Full month-by-month attendance breakdown for one student.
    Returns 12 months of data with % per month.
    """
    conn    = get_db()
    student = conn.execute("SELECT * FROM students WHERE id=?", (student_db_id,)).fetchone()
    if not student:
        conn.close()
        raise HTTPException(404, "Student not found")

    today = date.today()
    breakdown = []
    for i in range(11, -1, -1):
        # Go back i months from current month
        y = today.year  - ((today.month - 1 - (11 - i)) // 12 if (today.month - 1 - (11 - i)) < 0 else 0)
        m = ((today.month - 1 - (11 - i)) % 12) + 1
        if i < today.month:
            y = today.year
            m = today.month - i
        else:
            y = today.year - 1
            m = today.month - i + 12

        _, last_day   = calendar.monthrange(y, m)
        mstart = date(y, m, 1).isoformat()
        if y == today.year and m == today.month:
            mend = today.isoformat()
            wdays = today.day
        else:
            mend  = date(y, m, last_day).isoformat()
            wdays = last_day

        cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM attendance WHERE student_id=? AND date>=? AND date<=?",
            (student_db_id, mstart, mend),
        ).fetchone()["c"]

        breakdown.append({
            "month":         m,
            "year":          y,
            "month_name":    datetime(y, m, 1).strftime("%b %Y"),
            "present_days":  cnt,
            "working_days":  wdays,
            "absent_days":   wdays - cnt,
            "percentage":    round(cnt / wdays * 100, 1) if wdays else 0,
        })

    conn.close()
    return {"student": dict(student), "monthly_breakdown": breakdown}


@app.get("/api/admin/date-range-report", tags=["Admin Reports"])
async def date_range_report(
    start_date: str,
    end_date:   str,
    admin=Depends(get_current_admin),
):
    """Attendance report between two arbitrary dates for all students."""
    conn    = get_db()
    students = conn.execute("SELECT id, name, student_id, class_name FROM students ORDER BY name").fetchall()

    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end   = datetime.strptime(end_date,   "%Y-%m-%d").date()
    total_days = (end - start).days + 1

    report = []
    for s in students:
        cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM attendance WHERE student_id=? AND date>=? AND date<=?",
            (s["id"], start_date, end_date),
        ).fetchone()["c"]
        report.append({
            "id":           s["id"],
            "name":         s["name"],
            "student_id":   s["student_id"],
            "class_name":   s["class_name"],
            "present_days": cnt,
            "total_days":   total_days,
            "absent_days":  total_days - cnt,
            "percentage":   round(cnt / total_days * 100, 1) if total_days else 0,
        })

    conn.close()
    return {
        "start_date":     start_date,
        "end_date":       end_date,
        "total_days":     total_days,
        "total_students": len(report),
        "report":         report,
    }


@app.get("/api/admin/export-monthly", tags=["Admin Reports"])
async def export_monthly_csv(
    year:  int = 0,
    month: int = 0,
    admin=Depends(get_current_admin),
):
    """Export monthly attendance report as CSV."""
    today = date.today()
    year  = year  or today.year
    month = month or today.month
    _, last_day  = calendar.monthrange(year, month)
    month_start  = date(year, month, 1).isoformat()
    month_end    = date(year, month, last_day).isoformat() if not (year == today.year and month == today.month) else today.isoformat()
    working_days = last_day if not (year == today.year and month == today.month) else today.day

    conn     = get_db()
    students = conn.execute("SELECT id, name, student_id, class_name FROM students ORDER BY name").fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    month_name = datetime(year, month, 1).strftime("%B %Y")
    writer.writerow([f"Monthly Attendance Report – {month_name}"])
    writer.writerow([f"Working Days: {working_days}"])
    writer.writerow([])
    writer.writerow(["Name", "Student ID", "Class", "Present Days", "Absent Days", "Working Days", "Attendance %", "Status"])

    for s in students:
        cnt = conn.execute(
            "SELECT COUNT(*) AS c FROM attendance WHERE student_id=? AND date>=? AND date<=?",
            (s["id"], month_start, month_end),
        ).fetchone()["c"]
        pct    = round(cnt / working_days * 100, 1) if working_days else 0
        status = "Low Attendance" if pct < 75 else ("Good" if pct < 90 else "Excellent")
        writer.writerow([s["name"], s["student_id"], s["class_name"], cnt, working_days - cnt, working_days, f"{pct}%", status])

    conn.close()
    output.seek(0)
    filename = f"attendance_{year}_{month:02d}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ══════════════════════════════════════════════════════════════════════════════
# STUDENT ROUTES  (public)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/students/register", tags=["Students"])
async def register_student(
    name:       str = Form(...),
    student_id: str = Form(...),
    class_name: str = Form(...),
    email:      str = Form(""),
    image:      str = Form(...),
):
    try:
        img_np   = decode_image(image)
        encoding = get_face_encoding(img_np)
    except Exception as e:
        raise HTTPException(400, f"Image processing error: {e}")

    if encoding is None:
        raise HTTPException(400, "No face detected. Retake with a clear front-facing photo.")

    conn = get_db()
    existing = conn.execute("SELECT id FROM students WHERE student_id=?", (student_id,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(409, f"Student ID '{student_id}' already registered.")

    uid        = str(uuid.uuid4())
    image_path = str(UPLOAD_DIR / f"{uid}.jpg")
    Image.fromarray(img_np).save(image_path, "JPEG", quality=85)

    conn.execute(
        "INSERT INTO students (id, name, student_id, class_name, email, encoding, image_path, created_at) VALUES (?,?,?,?,?,?,?,?)",
        (uid, name, student_id, class_name, email, json.dumps(encoding), image_path, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": f"✅ {name} registered successfully!", "student": {"id": uid, "name": name, "student_id": student_id}}


@app.get("/api/students", tags=["Students"])
async def get_all_students():
    conn = get_db()
    rows = conn.execute("SELECT id, name, student_id, class_name, email, created_at FROM students ORDER BY name").fetchall()
    conn.close()
    return {"students": [dict(r) for r in rows]}


@app.delete("/api/students/{uid}", tags=["Students"])
async def delete_student(uid: str):
    conn = get_db()
    row  = conn.execute("SELECT image_path FROM students WHERE id=?", (uid,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Student not found.")
    if row["image_path"] and os.path.exists(row["image_path"]):
        os.remove(row["image_path"])
    conn.execute("DELETE FROM students WHERE id=?", (uid,))
    conn.execute("DELETE FROM attendance WHERE student_id=?", (uid,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Student deleted."}


# ══════════════════════════════════════════════════════════════════════════════
# ATTENDANCE ROUTES  (public)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/attendance/recognize", tags=["Attendance"])
async def recognize_face(image: str = Form(...)):
    try:
        img_np  = decode_image(image)
        unknown = get_face_encoding(img_np)
    except Exception as e:
        raise HTTPException(400, f"Image error: {e}")

    if unknown is None:
        return {"recognized": False, "message": "No face detected in frame."}

    students, encodings = load_known_encodings()
    if not students:
        return {"recognized": False, "message": "No students registered yet."}

    enc_array = np.array(encodings)
    distances = face_recognition.face_distance(enc_array, np.array(unknown))
    best_idx  = int(np.argmin(distances))
    best_dist = float(distances[best_idx])
    THRESHOLD = 0.55

    if best_dist > THRESHOLD:
        return {"recognized": False, "message": "Face not recognized.", "distance": best_dist}

    student    = students[best_idx]
    confidence = round((1 - best_dist) * 100, 1)
    today      = date.today().isoformat()
    now_time   = datetime.now().strftime("%H:%M:%S")

    conn    = get_db()
    already = conn.execute(
        "SELECT id FROM attendance WHERE student_id=? AND date=?", (student["id"], today)
    ).fetchone()

    if already:
        conn.close()
        return {"recognized": True, "already_marked": True, "student": student, "confidence": confidence,
                "message": f"⚠️ {student['name']} already marked present today."}

    conn.execute(
        "INSERT INTO attendance (student_id, date, time, status, confidence) VALUES (?,?,?,'present',?)",
        (student["id"], today, now_time, confidence),
    )
    conn.commit()
    conn.close()
    return {"recognized": True, "already_marked": False, "student": student,
            "confidence": confidence, "time": now_time,
            "message": f"✅ {student['name']} marked present at {now_time}"}


@app.post("/api/attendance/manual", tags=["Attendance"])
async def manual_mark(student_db_id: str = Form(...)):
    conn = get_db()
    row  = conn.execute("SELECT * FROM students WHERE id=?", (student_db_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Student not found.")
    today    = date.today().isoformat()
    now_time = datetime.now().strftime("%H:%M:%S")
    already  = conn.execute(
        "SELECT id FROM attendance WHERE student_id=? AND date=?", (student_db_id, today)
    ).fetchone()
    if already:
        conn.close()
        return {"success": False, "message": f"{row['name']} already marked present today."}
    conn.execute(
        "INSERT INTO attendance (student_id, date, time, status, confidence) VALUES (?,?,?,'present',100)",
        (student_db_id, today, now_time),
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": f"✅ {row['name']} marked present manually."}


@app.get("/api/attendance/today", tags=["Attendance"])
async def get_today():
    today = date.today().isoformat()
    conn  = get_db()
    records = conn.execute(
        "SELECT a.*, s.name, s.student_id, s.class_name FROM attendance a JOIN students s ON a.student_id=s.id WHERE a.date=? ORDER BY a.time",
        (today,),
    ).fetchall()
    total = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    conn.close()
    present = len(records)
    return {"date": today, "total": total, "present": present, "absent": total - present,
            "percentage": round(present / total * 100, 1) if total else 0,
            "records": [dict(r) for r in records]}


@app.get("/api/attendance/history", tags=["Attendance"])
async def get_history(days: int = 7):
    conn = get_db()
    rows = conn.execute(
        "SELECT date, COUNT(*) AS present_count FROM attendance WHERE date>=date('now',?) GROUP BY date ORDER BY date",
        (f"-{days} days",),
    ).fetchall()
    conn.close()
    return {"history": [dict(r) for r in rows]}


@app.get("/api/attendance/all-students-status", tags=["Attendance"])
async def all_students_status():
    today = date.today().isoformat()
    conn  = get_db()
    rows  = conn.execute(
        """SELECT s.id, s.name, s.student_id, s.class_name, s.email,
                  CASE WHEN a.id IS NOT NULL THEN 'present' ELSE 'absent' END AS status,
                  a.time, a.confidence
           FROM students s
           LEFT JOIN attendance a ON s.id=a.student_id AND a.date=?
           ORDER BY s.name""",
        (today,),
    ).fetchall()
    conn.close()
    return {"students": [dict(r) for r in rows]}


@app.get("/api/attendance/export", tags=["Attendance"])
async def export_csv(date_str: str = ""):
    target = date_str or date.today().isoformat()
    conn   = get_db()
    rows   = conn.execute(
        """SELECT s.name, s.student_id, s.class_name,
                  CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'Absent' END AS status,
                  COALESCE(a.time,'') AS time, COALESCE(CAST(a.confidence AS TEXT),'') AS confidence
           FROM students s LEFT JOIN attendance a ON s.id=a.student_id AND a.date=?
           ORDER BY s.name""",
        (target,),
    ).fetchall()
    conn.close()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Student ID", "Class", "Status", "Time", "Confidence (%)"])
    for r in rows:
        writer.writerow([r["name"], r["student_id"], r["class_name"], r["status"], r["time"], r["confidence"]])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{target}.csv"},
    )


@app.get("/api/health", tags=["System"])
async def health():
    conn  = get_db()
    count = conn.execute("SELECT COUNT(*) AS c FROM students").fetchone()["c"]
    conn.close()
    return {"status": "ok", "students_registered": count, "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
