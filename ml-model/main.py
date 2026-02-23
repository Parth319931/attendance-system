from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import shutil
import os
from dotenv import load_dotenv
from face_encoder import encode_student_image
from recognizer import recognize_faces_in_photo

load_dotenv()

app = FastAPI(title="AttendAI - Face Recognition Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_PATH = os.getenv("TEMP_PATH", "temp_uploads")
os.makedirs(TEMP_PATH, exist_ok=True)
os.makedirs("face_db", exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_MB = 15


@app.get("/")
def root():
    return {"message": "Face Recognition ML Service is running"}


@app.get("/health")
def health():
    from face_encoder import load_all_encodings
    encodings = load_all_encodings()
    return {
        "status": "healthy",
        "encodings_loaded": len(encodings),
        "temp_path": TEMP_PATH,
    }


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "ML service error. Check server logs for details."}
    )


def validate_image(file: UploadFile) -> None:
    """Validates file type and size before processing."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed types: jpg, jpeg, png, webp"
        )


@app.post("/encode-face")
async def encode_face(uid: str, file: UploadFile = File(...)):
    """Called when a student registers. Saves their face encoding."""

    if not uid or not uid.strip():
        raise HTTPException(status_code=400, detail="Student UID is required")

    validate_image(file)

    temp_path = os.path.join(TEMP_PATH, f"{uid}_register.jpg")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check file is not empty
        if os.path.getsize(temp_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        success, message = encode_student_image(uid, temp_path)

        if not success:
            raise HTTPException(status_code=400, detail=message)

        return {"success": True, "message": message, "uid": uid}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encoding failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    """Called when teacher uploads a class photo."""

    validate_image(file)

    temp_path = os.path.join(TEMP_PATH, f"class_photo_{file.filename}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if os.path.getsize(temp_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        present_uids = recognize_faces_in_photo(temp_path)

        return {
            "present_uids": present_uids,
            "count": len(present_uids),
            "message": f"Recognized {len(present_uids)} student(s) in the photo"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/face-db-status")
def face_db_status():
    face_db_path = os.getenv("FACE_DB_PATH", "face_db")
    if not os.path.exists(face_db_path):
        return {"total_encodings": 0, "students": []}
    files = [f.replace(".pkl", "") for f in os.listdir(face_db_path) if f.endswith(".pkl")]
    return {"total_encodings": len(files), "students": files}


@app.delete("/face-db/{uid}")
def delete_encoding(uid: str):
    """Deletes a student's face encoding — useful if student re-registers."""
    face_db_path = os.getenv("FACE_DB_PATH", "face_db")
    file_path = os.path.join(face_db_path, f"{uid}.pkl")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"No encoding found for UID {uid}")
    os.remove(file_path)
    return {"message": f"Encoding deleted for {uid}"}