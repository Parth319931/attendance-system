import os
import shutil
import httpx
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from database import get_db
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/ml", tags=["ML"])

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")


@router.post("/recognize")
async def recognize_faces(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    division: str = Form(...),
    date: str = Form(...),
    teacher_id: str = Form(...),
):
    db = get_db()

    # Verify subject exists
    subject = db.table("subjects").select("*").eq("subject_code", subject_code).execute()
    if not subject.data:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Save uploaded class photo temporarily
    os.makedirs("class_photos", exist_ok=True)
    photo_path = f"class_photos/{subject_code}_{division}_{date}.jpg"
    with open(photo_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ── Call the ML Service ──────────────────────────
    try:
        with open(photo_path, "rb") as photo_file:
            async with httpx.AsyncClient(timeout=120.0) as client:
                ml_response = await client.post(
                    f"{ML_SERVICE_URL}/recognize",
                    files={"file": ("class_photo.jpg", photo_file, "image/jpeg")}
                )

        if ml_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"ML service error: {ml_response.text}"
            )

        ml_result = ml_response.json()
        present_uids = ml_result.get("present_uids", [])

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="ML service is not running. Please start the ML server on port 8001."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="ML service timed out. The photo may be too large or complex."
        )

    # ── Get all students in this division registered for this subject ──
    student_subjects = db.table("student_subjects")\
        .select("student_uid")\
        .eq("subject_code", subject_code)\
        .execute()

    registered_uids = [s["student_uid"] for s in student_subjects.data]

    # Filter to only students in this division
    division_students = []
    for uid in registered_uids:
        student = db.table("students")\
            .select("uid, division")\
            .eq("uid", uid)\
            .execute()
        if student.data and student.data[0]["division"] == division:
            division_students.append(uid)

    # ── Mark attendance for each student ──────────────
    marked_present = []
    marked_absent = []

    for uid in division_students:
        status = "present" if uid in present_uids else "absent"

        # Check if record already exists for this session
        existing = db.table("attendance").select("*")\
            .eq("student_uid", uid)\
            .eq("subject_code", subject_code)\
            .eq("date", date)\
            .execute()

        if existing.data:
            # Update existing record only if not manually overridden
            if not existing.data[0].get("is_manual_override", False):
                db.table("attendance").update({
                    "status": status,
                    "teacher_id": teacher_id,
                })\
                .eq("student_uid", uid)\
                .eq("subject_code", subject_code)\
                .eq("date", date)\
                .execute()
        else:
            # Insert new record
            db.table("attendance").insert({
                "student_uid": uid,
                "subject_code": subject_code,
                "teacher_id": teacher_id,
                "division": division,
                "date": date,
                "status": status,
                "is_manual_override": False,
            }).execute()

        if status == "present":
            marked_present.append(uid)
        else:
            marked_absent.append(uid)

    return {
        "message": "Attendance marked successfully",
        "total_students": len(division_students),
        "present_count": len(marked_present),
        "absent_count": len(marked_absent),
        "present_uids": marked_present,
        "absent_uids": marked_absent,
        "faces_detected": ml_result.get("count", 0),
    }


@router.post("/encode-student")
async def encode_student(uid: str, face_image_path: str):
    """
    Calls ML service to generate and store face encoding for a student.
    Called automatically after student registration.
    """
    try:
        with open(face_image_path, "rb") as image_file:
            async with httpx.AsyncClient(timeout=60.0) as client:
                ml_response = await client.post(
                    f"{ML_SERVICE_URL}/encode-face",
                    params={"uid": uid},
                    files={"file": ("face.jpg", image_file, "image/jpeg")}
                )

        if ml_response.status_code != 200:
            return {"success": False, "message": ml_response.text}

        return ml_response.json()

    except httpx.ConnectError:
        return {
            "success": False,
            "message": "ML service not running. Face encoding will be skipped."
        }

@router.post("/recognize-with-results")
async def recognize_with_results(
    file: UploadFile = File(...),
    subject_code: str = Form(...),
    division: str = Form(...),
    date: str = Form(...),
    teacher_id: str = Form(...),
    present_uids: str = Form(default="[]"),
):
    import json
    db = get_db()

    # Parse present UIDs from frontend ML result
    try:
        present_list = json.loads(present_uids)
    except:
        present_list = []

    # Save photo
    os.makedirs("class_photos", exist_ok=True)
    photo_path = f"class_photos/{subject_code}_{division}_{date}.jpg"
    with open(photo_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get all students in this division registered for this subject
    student_subjects = db.table("student_subjects")\
        .select("student_uid")\
        .eq("subject_code", subject_code)\
        .execute()

    registered_uids = [s["student_uid"] for s in student_subjects.data]

    division_students = []
    for uid in registered_uids:
        student = db.table("students").select("uid, division").eq("uid", uid).execute()
        if student.data and student.data[0]["division"] == division:
            division_students.append(uid)

    # Mark attendance based on ML results
    marked_present = []
    marked_absent = []

    for uid in division_students:
        status = "present" if uid in present_list else "absent"

        existing = db.table("attendance").select("*")\
            .eq("student_uid", uid)\
            .eq("subject_code", subject_code)\
            .eq("date", date)\
            .execute()

        if existing.data:
            if not existing.data[0].get("is_manual_override", False):
                db.table("attendance").update({
                    "status": status,
                    "teacher_id": teacher_id,
                }).eq("student_uid", uid)\
                  .eq("subject_code", subject_code)\
                  .eq("date", date)\
                  .execute()
        else:
            db.table("attendance").insert({
                "student_uid": uid,
                "subject_code": subject_code,
                "teacher_id": teacher_id,
                "division": division,
                "date": date,
                "status": status,
                "is_manual_override": False,
            }).execute()

        if status == "present":
            marked_present.append(uid)
        else:
            marked_absent.append(uid)

    return {
        "message": "Attendance marked successfully",
        "total_students": len(division_students),
        "present_count": len(marked_present),
        "absent_count": len(marked_absent),
        "present_uids": marked_present,
        "absent_uids": marked_absent,
    }