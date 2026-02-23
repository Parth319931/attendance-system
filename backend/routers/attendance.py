from fastapi import APIRouter, HTTPException
from schemas import ManualOverrideRequest
from database import get_db
from datetime import date

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.get("/subjects")
def get_all_subjects():
    db = get_db()
    result = db.table("subjects").select("*").execute()
    return {"subjects": result.data}


@router.get("/student/{uid}")
def get_student_attendance(uid: str):
    db = get_db()
    result = db.table("attendance").select("*").eq("student_uid", uid).order("date", desc=True).execute()
    return {"uid": uid, "attendance": result.data}


@router.get("/{subject_code}/{division}/{date}")
def get_attendance(subject_code: str, division: str, date: str):
    db = get_db()

    # Get all students in this division
    students_result = db.table("students").select("uid, full_name").eq("division", division).execute()
    all_students = students_result.data

    # Get attendance records for this session
    attendance_result = db.table("attendance")\
        .select("*")\
        .eq("subject_code", subject_code)\
        .eq("division", division)\
        .eq("date", date)\
        .execute()

    attendance_map = {a["student_uid"]: a for a in attendance_result.data}

    # Merge — every student appears with their status
    merged = []
    for student in all_students:
        uid = student["uid"]
        if uid in attendance_map:
            record = attendance_map[uid]
            merged.append({
                "student_uid": uid,
                "full_name": student["full_name"],
                "status": record["status"],
                "is_manual_override": record["is_manual_override"],
            })
        else:
            merged.append({
                "student_uid": uid,
                "full_name": student["full_name"],
                "status": "absent",
                "is_manual_override": False,
            })

    return {"attendance": merged}


@router.post("/manual-override")
def manual_override(request: ManualOverrideRequest):
    db = get_db()

    existing = db.table("attendance").select("*")\
        .eq("student_uid", request.student_uid)\
        .eq("subject_code", request.subject_code)\
        .eq("date", str(request.date))\
        .execute()

    if existing.data:
        db.table("attendance").update({
            "status": "present",
            "is_manual_override": True
        }).eq("student_uid", request.student_uid)\
          .eq("subject_code", request.subject_code)\
          .eq("date", str(request.date))\
          .execute()
    else:
        db.table("attendance").insert({
            "student_uid": request.student_uid,
            "subject_code": request.subject_code,
            "teacher_id": None,
            "division": request.division,
            "date": str(request.date),
            "status": "present",
            "is_manual_override": True
        }).execute()

    return {"message": f"Attendance manually marked present for {request.student_uid}"}