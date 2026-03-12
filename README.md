# 🎓 AttendAI — AI-Powered Attendance Management System

An intelligent attendance system that uses **facial recognition** to automatically identify students from group class photographs. Teachers upload a single photo after class and the system detects all faces, matches them against registered student profiles, and marks attendance in real time.

🌐 **Live Demo:** [attendance-system-ecru-nine.vercel.app](https://attendance-system-ecru-nine.vercel.app)

---

## ✨ Features

- 🤖 **AI Face Recognition** — Automatically identifies students from group class photos using FaceNet neural network
- ⚡ **Real-Time Updates** — Student dashboards update instantly when teacher marks attendance (no page refresh needed)
- 🔐 **Role-Based Authentication** — Separate login flows for students and teachers with JWT tokens
- 📊 **Attendance Dashboard** — Students see subject-wise attendance percentage with color coding
- ✏️ **Manual Override** — Teachers can correct any ML errors by manually marking students present
- 📱 **Responsive UI** — Dark techy design that works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| ML Service | DeepFace, FaceNet, RetinaFace, MTCNN |
| Database | PostgreSQL via Supabase |
| Real-Time | Supabase Realtime (WebSocket) |
| Deployment | Vercel (Frontend), Render (Backend) |

---

## 🏗️ System Architecture
```
Student/Teacher Browser (Vercel)
        ↓
FastAPI Backend (Render)
        ↓                    ↓
Supabase Database      ML Service (Local)
(PostgreSQL +
 Realtime)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11
- Supabase account
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Parth319931/attendance-system.git
cd attendance-system
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ML_SERVICE_URL=http://localhost:8001
```

Run backend:
```bash
uvicorn main:app --reload
```

### 3. ML Service Setup
```bash
cd ml-model
python -m venv venv
venv\Scripts\activate        # Windows
pip install fastapi uvicorn python-multipart numpy opencv-python deepface tf-keras retina-face mtcnn python-dotenv
```

Create `ml-model/.env`:
```
FACE_DB_PATH=face_db
TEMP_PATH=temp_uploads
TOLERANCE=0.5
```

Run ML service:
```bash
uvicorn main:app --reload --port 8001
```

### 4. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ⚠️ Important: Running Attendance Feature

> **The ML face recognition service must be running locally on your machine whenever a teacher marks attendance.**

This is because the DeepFace + TensorFlow model requires 2GB+ RAM which exceeds free cloud hosting limits. All other features (login, registration, viewing attendance) work fully on the deployed cloud version without running anything locally.

**To mark attendance:**

1. Start the ML server locally:
```bash
cd ml-model
venv\Scripts\activate
uvicorn main:app --reload --port 8001
```

2. Visit the live site: [attendance-system-ecru-nine.vercel.app](https://attendance-system-ecru-nine.vercel.app)
3. Login as teacher → select session → upload class photo → ML runs locally and saves results to cloud

---

## 🧠 How Face Recognition Works
```
Student Registration
    Photo → RetinaFace (detect face) → FaceNet (128-dim embedding) → Save .pkl file

Teacher Uploads Class Photo
    Group Photo → RetinaFace/MTCNN/OpenCV (detect all faces)
               → FaceNet (embed each face)
               → Cosine Similarity vs all student embeddings
               → threshold ≥ 0.60 → PRESENT
               → threshold < 0.60 → ABSENT
               → Save to Supabase → Realtime push to students
```

**Models Used:**
- **FaceNet** (Google, 2015) — Generates 128-dimensional face embedding vectors. Pre-trained on millions of face images.
- **RetinaFace** — State-of-the-art face detector for group photos with multiple faces at different angles.
- **MTCNN** — Fallback multi-face detector using cascaded neural networks.

No model training was performed. The system uses **transfer learning** — leveraging models pre-trained on millions of face images and applying them directly to the attendance use case.

---

## 📁 Project Structure
```
attendance-system/
├── frontend/                  # Next.js application
│   ├── app/
│   │   ├── page.tsx           # Home page
│   │   ├── student/
│   │   │   ├── register/      # Student registration
│   │   │   ├── login/         # Student login
│   │   │   └── dashboard/     # Attendance dashboard
│   │   └── teacher/
│   │       ├── login/         # Teacher login
│   │       └── dashboard/     # Attendance marking
│   ├── components/            # Reusable components
│   └── lib/                   # API client, Supabase client
├── backend/                   # FastAPI application
│   ├── main.py                # App entry point + CORS
│   ├── database.py            # Supabase client
│   ├── routers/               # Route handlers
│   │   ├── auth.py            # Login endpoints
│   │   ├── students.py        # Student endpoints
│   │   ├── teachers.py        # Teacher endpoints
│   │   ├── attendance.py      # Attendance endpoints
│   │   └── ml.py              # ML service bridge
│   ├── schemas/               # Pydantic models
│   └── utils/                 # JWT + password helpers
└── ml-model/                  # Face recognition service
    ├── main.py                # FastAPI ML server
    ├── face_encoder.py        # Enrollment pipeline
    ├── recognizer.py          # Recognition pipeline
    └── face_db/               # Stored face encodings (.pkl)
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `students` | Student profiles + face image path |
| `teachers` | Teacher profiles |
| `subjects` | Subject catalog |
| `student_subjects` | Student ↔ Subject enrollment |
| `teacher_subjects` | Teacher ↔ Subject + Division assignment |
| `attendance` | Attendance records with manual override flag |

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [attendance-system-ecru-nine.vercel.app](https://attendance-system-ecru-nine.vercel.app) |
| Backend | Render | attendance-system-soad.onrender.com |
| Database | Supabase | Cloud hosted |
| ML Service | Local | Must run on teacher's machine |

> **Note:** The Render free tier sleeps after 15 minutes of inactivity. First request after sleep takes 30–60 seconds. Visit the backend health endpoint once before a demo to wake it up: `https://attendance-system-soad.onrender.com/health`

---

## 👨‍💻 Developer

**Parth** — 3rd Year B.Tech Student  
Built independently over 3 weeks — February 2026

---

## 📄 License

This project is for educational purposes.