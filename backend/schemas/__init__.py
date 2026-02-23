from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

# ─── AUTH ───────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

# ─── STUDENT ────────────────────────────────────────
class StudentRegister(BaseModel):
    uid: str
    full_name: str
    email: str
    password: str
    branch: str
    division: str
    subject_codes: List[str]

class StudentResponse(BaseModel):
    uid: str
    full_name: str
    email: str
    branch: str
    division: str

# ─── TEACHER ────────────────────────────────────────
class TeacherRegister(BaseModel):
    teacher_id: str
    full_name: str
    email: str
    password: str
    department: str

class TeacherResponse(BaseModel):
    teacher_id: str
    full_name: str
    email: str
    department: str

# ─── ATTENDANCE ─────────────────────────────────────
class AttendanceRecord(BaseModel):
    student_uid: str
    subject_code: str
    division: str
    date: date
    status: str

class ManualOverrideRequest(BaseModel):
    student_uid: str
    subject_code: str
    date: date
    division: str