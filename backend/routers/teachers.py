from fastapi import APIRouter, HTTPException
from schemas import TeacherRegister, TeacherResponse
from database import get_db
from utils.auth_helper import hash_password

router = APIRouter(prefix="/teachers", tags=["Teachers"])

@router.post("/register")
def register_teacher(request: TeacherRegister):
    db = get_db()

    existing = db.table("teachers").select("teacher_id").eq("teacher_id", request.teacher_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Teacher ID already exists")

    existing_email = db.table("teachers").select("email").eq("email", request.email).execute()
    if existing_email.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(request.password)

    db.table("teachers").insert({
        "teacher_id": request.teacher_id,
        "full_name": request.full_name,
        "email": request.email,
        "password_hash": hashed,
        "department": request.department
    }).execute()

    return {"message": "Teacher registered successfully", "teacher_id": request.teacher_id}


@router.get("/{teacher_id}", response_model=TeacherResponse)
def get_teacher(teacher_id: str):
    db = get_db()
    result = db.table("teachers").select("*").eq("teacher_id", teacher_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return result.data[0]


@router.post("/{teacher_id}/assign-subject")
def assign_subject_to_teacher(teacher_id: str, subject_code: str, division: str):
    db = get_db()

    teacher = db.table("teachers").select("teacher_id").eq("teacher_id", teacher_id).execute()
    if not teacher.data:
        raise HTTPException(status_code=404, detail="Teacher not found")

    subject = db.table("subjects").select("subject_code").eq("subject_code", subject_code).execute()
    if not subject.data:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.table("teacher_subjects").insert({
        "teacher_id": teacher_id,
        "subject_code": subject_code,
        "division": division
    }).execute()

    return {"message": "Subject assigned to teacher successfully"}


@router.get("/{teacher_id}/subjects")
def get_teacher_subjects(teacher_id: str):
    db = get_db()
    result = db.table("teacher_subjects").select("*").eq("teacher_id", teacher_id).execute()
    return {"teacher_id": teacher_id, "subjects": result.data}