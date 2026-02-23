import os
import shutil
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from schemas import StudentResponse
from database import get_db
from utils.auth_helper import hash_password
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/students", tags=["Students"])
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")


@router.post("/register")
async def register_student(
    uid: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    branch: str = Form(...),
    division: str = Form(...),
    subject_codes: str = Form(...),
    face_image: UploadFile = File(...)
):
    db = get_db()

    # Check duplicates
    existing = db.table("students").select("uid").eq("uid", uid).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Student with this UID already exists")

    existing_email = db.table("students").select("email").eq("email", email).execute()
    if existing_email.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Save face image
    os.makedirs("face_images", exist_ok=True)
    image_path = f"face_images/{uid}.jpg"
    with open(image_path, "wb") as buffer:
        shutil.copyfileobj(face_image.file, buffer)

    # Hash password and insert student
    hashed = hash_password(password)
    db.table("students").insert({
        "uid": uid,
        "full_name": full_name,
        "email": email,
        "password_hash": hashed,
        "branch": branch,
        "division": division,
        "face_image_path": image_path
    }).execute()

    # Register subjects
    subject_list = [s.strip() for s in subject_codes.split(",")]
    for code in subject_list:
        subject_check = db.table("subjects")\
            .select("subject_code")\
            .eq("subject_code", code)\
            .execute()
        if subject_check.data:
            db.table("student_subjects").insert({
                "student_uid": uid,
                "subject_code": code
            }).execute()

    # ── Auto-encode face via ML service ──────────────
    encoding_status = "skipped"
    try:
        with open(image_path, "rb") as image_file:
            async with httpx.AsyncClient(timeout=60.0) as client:
                ml_response = await client.post(
                    f"{ML_SERVICE_URL}/encode-face",
                    params={"uid": uid},
                    files={"file": ("face.jpg", image_file, "image/jpeg")}
                )
        if ml_response.status_code == 200:
            encoding_status = "success"
        else:
            encoding_status = "failed"
    except httpx.ConnectError:
        encoding_status = "ml_service_offline"

    return {
        "message": "Student registered successfully",
        "uid": uid,
        "face_encoding_status": encoding_status
    }


@router.get("/{uid}", response_model=StudentResponse)
def get_student(uid: str):
    db = get_db()
    result = db.table("students").select("*").eq("uid", uid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return result.data[0]


@router.get("/{uid}/subjects")
def get_student_subjects(uid: str):
    db = get_db()
    result = db.table("student_subjects")\
        .select("subject_code")\
        .eq("student_uid", uid)\
        .execute()
    return {"uid": uid, "subjects": result.data}