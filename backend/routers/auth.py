from fastapi import APIRouter, HTTPException
from schemas import LoginRequest, TokenResponse
from database import get_db
from utils.auth_helper import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/student/login", response_model=TokenResponse)
def student_login(request: LoginRequest):
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    db = get_db()
    result = db.table("students").select("*").eq("email", request.email).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="No student found with this email")

    student = result.data[0]

    if not verify_password(request.password, student["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = create_access_token({
        "sub": student["uid"],
        "role": "student",
        "name": student["full_name"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "student",
        "name": student["full_name"]
    }


@router.post("/teacher/login", response_model=TokenResponse)
def teacher_login(request: LoginRequest):
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    db = get_db()
    result = db.table("teachers").select("*").eq("email", request.email).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="No teacher found with this email")

    teacher = result.data[0]

    if not verify_password(request.password, teacher["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = create_access_token({
        "sub": teacher["teacher_id"],
        "role": "teacher",
        "name": teacher["full_name"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "teacher",
        "name": teacher["full_name"]
    }