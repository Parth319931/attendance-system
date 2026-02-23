import numpy as np
import pickle
import os
from dotenv import load_dotenv
from deepface import DeepFace

load_dotenv()
FACE_DB_PATH = os.getenv("FACE_DB_PATH", "face_db")
MODEL_NAME = "Facenet"


def generate_encoding(image_path: str):
    """
    Takes a path to a student's face image.
    Returns a face embedding vector or None if no face found.
    """
    try:
        embedding = DeepFace.represent(
            img_path=image_path,
            model_name=MODEL_NAME,
            enforce_detection=True
        )
        return np.array(embedding[0]["embedding"])
    except Exception as e:
        print(f"Face encoding error: {e}")
        return None


def save_encoding(uid: str, encoding):
    """
    Saves a student's face encoding to disk as a .pkl file.
    """
    os.makedirs(FACE_DB_PATH, exist_ok=True)
    file_path = os.path.join(FACE_DB_PATH, f"{uid}.pkl")
    with open(file_path, "wb") as f:
        pickle.dump(encoding, f)
    return file_path


def load_all_encodings():
    """
    Loads all stored student face encodings from disk.
    Returns a dict: { uid: encoding }
    """
    encodings = {}
    if not os.path.exists(FACE_DB_PATH):
        return encodings

    for filename in os.listdir(FACE_DB_PATH):
        if filename.endswith(".pkl"):
            uid = filename.replace(".pkl", "")
            file_path = os.path.join(FACE_DB_PATH, filename)
            with open(file_path, "rb") as f:
                encodings[uid] = pickle.load(f)

    return encodings


def encode_student_image(uid: str, image_path: str):
    """
    Full pipeline: generate encoding from image and save it.
    Returns success status and message.
    """
    encoding = generate_encoding(image_path)

    if encoding is None:
        return False, "No face detected in the image. Please use a clear front-facing photo."

    save_encoding(uid, encoding)
    return True, f"Face encoding saved for student {uid}"