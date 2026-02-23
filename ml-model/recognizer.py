import numpy as np
import os
import cv2
from dotenv import load_dotenv
from deepface import DeepFace
from face_encoder import load_all_encodings

load_dotenv()
MODEL_NAME = "Facenet"
SIMILARITY_THRESHOLD = 0.70


def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def preprocess_image(photo_path: str) -> str:
    """
    Resizes large images and improves contrast for better face detection.
    Returns path to processed image.
    """
    img = cv2.imread(photo_path)
    if img is None:
        return photo_path

    # Resize if image is very large — large images slow down detection
    max_dimension = 1920
    h, w = img.shape[:2]
    if max(h, w) > max_dimension:
        scale = max_dimension / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h))
        print(f"  Resized image from {w}x{h} to {new_w}x{new_h}")

    # Save preprocessed image
    processed_path = photo_path.replace(".jpg", "_processed.jpg")
    cv2.imwrite(processed_path, img)
    return processed_path


def detect_faces_with_fallback(photo_path: str) -> list:
    """
    Tries multiple face detectors in order until one finds faces.
    This is the key fix for group photos.
    """
    # These detectors are tried in order — retinaface is best for groups
    detectors = ["retinaface", "mtcnn", "opencv", "ssd"]

    for detector in detectors:
        try:
            print(f"  Trying detector: {detector}...")
            faces = DeepFace.extract_faces(
                img_path=photo_path,
                enforce_detection=False,
                detector_backend=detector,
                align=True
            )
            # Filter out very low confidence detections
            valid_faces = [f for f in faces if f.get("confidence", 1.0) > 0.5]

            if len(valid_faces) > 0:
                print(f"  ✓ {detector} found {len(valid_faces)} faces")
                return valid_faces
            else:
                print(f"  ✗ {detector} found no valid faces")

        except Exception as e:
            print(f"  ✗ {detector} failed: {e}")
            continue

    return []


def get_face_encoding(face_data: dict, temp_path: str) -> np.ndarray:
    """
    Generates encoding for a single detected face.
    """
    try:
        face_img = face_data["face"]

        # Convert to uint8 if needed
        if face_img.dtype != np.uint8:
            face_img = (face_img * 255).astype(np.uint8)

        # Make sure image is large enough for Facenet (minimum 160x160)
        if face_img.shape[0] < 160 or face_img.shape[1] < 160:
            face_img = cv2.resize(face_img, (160, 160))

        # Save temp face image
        cv2.imwrite(temp_path, cv2.cvtColor(face_img, cv2.COLOR_RGB2BGR))

        embedding_result = DeepFace.represent(
            img_path=temp_path,
            model_name=MODEL_NAME,
            enforce_detection=False
        )
        return np.array(embedding_result[0]["embedding"])

    except Exception as e:
        print(f"    Encoding error: {e}")
        return None


def recognize_faces_in_photo(photo_path: str) -> list:
    """
    Takes a group class photo path.
    Returns a list of UIDs of students who are present.
    """
    print(f"\n{'='*50}")
    print(f"Processing photo: {photo_path}")
    print(f"{'='*50}")

    # Preprocess image
    processed_path = preprocess_image(photo_path)

    # Detect faces using best available detector
    print("\nDetecting faces...")
    faces = detect_faces_with_fallback(processed_path)

    # Clean up processed image if different from original
    if processed_path != photo_path and os.path.exists(processed_path):
        os.remove(processed_path)

    if not faces:
        print("No faces detected in the class photo")
        return []

    print(f"\nTotal faces detected: {len(faces)}")

    # Load all stored student encodings
    known_encodings = load_all_encodings()
    print(f"Student encodings in database: {len(known_encodings)}")

    if not known_encodings:
        print("No student encodings found in database")
        return []

    present_uids = []
    os.makedirs("temp_uploads", exist_ok=True)

    # Match each detected face against known students
    print("\nMatching faces to students...")
    for i, face_data in enumerate(faces):
        print(f"\nFace {i + 1}/{len(faces)}:")

        temp_path = f"temp_uploads/temp_face_{i}.jpg"
        face_encoding = get_face_encoding(face_data, temp_path)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if face_encoding is None:
            print(f"  Could not generate encoding, skipping")
            continue

        # Compare against all known students
        best_similarity = -1
        best_uid = None

        for uid, known_encoding in known_encodings.items():
            try:
                similarity = cosine_similarity(face_encoding, known_encoding)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_uid = uid
            except Exception:
                continue

        print(f"  Best match: {best_uid} (similarity: {best_similarity:.3f}, threshold: {SIMILARITY_THRESHOLD})")

        if best_uid and best_similarity >= SIMILARITY_THRESHOLD:
            if best_uid not in present_uids:
                present_uids.append(best_uid)
                print(f"  ✓ MATCHED: {best_uid}")
        else:
            print(f"  ✗ No confident match found")

    print(f"\n{'='*50}")
    print(f"Recognition complete!")
    print(f"Present students: {present_uids}")
    print(f"{'='*50}\n")

    return present_uids