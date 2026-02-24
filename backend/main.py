from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, students, teachers, attendance, ml

app = FastAPI(title="Attendance Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://attendance-system-ecru-nine.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(teachers.router)
app.include_router(attendance.router)
app.include_router(ml.router)

@app.get("/")
def root():
    return {"message": "Attendance Management System API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "backend": "running",
        "version": "1.0.0"
    }

@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."}
    )