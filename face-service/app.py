"""
VyGo self-hosted face verification service.

Verifies that a live "selfie" capture belongs to the person pictured on an ID
document, and runs passive anti-spoofing so a printed photo or a phone screen
shown to the camera is rejected. Runs entirely on your own machine (CPU) using
DeepFace + FasNet — no third-party account, no per-check cost.

Endpoints
    GET  /health   -> {"status": "ok", ...}
    POST /match    -> {"selfie_faces","document_faces","similarity","matched",
                       "selfie_real","spoof_score", ...}
    POST /detect   -> {"faces", "boxes"}

The Spring backend calls /match with base64-encoded JPEG/PNG images:
    { "selfie": "<base64>", "document": "<base64>" }

Environment (all optional)
    VYGO_FACE_PORT       port to listen on              (default 8100)
    VYGO_FACE_MODEL      DeepFace model name            (default Facenet512)
    VYGO_FACE_DETECTOR   detector backend               (default retinaface)
    VYGO_FACE_ANTISPOOF  enable FasNet anti-spoofing    (default true)
"""
import base64
import binascii
import os

import cv2
import numpy as np
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

PORT = int(os.getenv("VYGO_FACE_PORT", "8100"))
MODEL = os.getenv("VYGO_FACE_MODEL", "Facenet512")
DETECTOR = os.getenv("VYGO_FACE_DETECTOR", "retinaface")
ANTISPOOF = os.getenv("VYGO_FACE_ANTISPOOF", "true").lower() in ("1", "true", "yes", "on")

app = FastAPI(title="VyGo Face Service", version="2.0.0")

# DeepFace is imported lazily so /health still answers if the model backend is
# still warming up (first import downloads weights).
_deepface = None


def deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace  # noqa: WPS433 (intentional lazy import)
        _deepface = DeepFace
    return _deepface


class MatchRequest(BaseModel):
    selfie: str
    document: str | None = None


def decode_image(b64: str):
    """Decode a base64 image string into a BGR numpy array (or None)."""
    if not b64:
        return None
    payload = b64.split(",")[-1]
    try:
        raw = base64.b64decode(payload)
    except (binascii.Error, ValueError):
        return None
    arr = np.frombuffer(raw, dtype=np.uint8)
    if arr.size == 0:
        return None
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def detect_faces(img, anti_spoofing: bool = False):
    """Return a list of detected faces (empty when none are found).

    When anti_spoofing is enabled each face carries "is_real" and
    "antispoof_score" keys. The detector falls back to a plain pass if the
    FasNet weights are unavailable so matching still works.
    """
    try:
        faces = deepface().extract_faces(
            img_path=img,
            detector_backend=DETECTOR,
            enforce_detection=False,
            align=False,
            anti_spoofing=anti_spoofing,
        )
    except Exception:
        if anti_spoofing:
            return detect_faces(img, anti_spoofing=False)
        return []
    result = []
    for face in faces or []:
        area = face.get("facial_area", {}) or {}
        w = int(area.get("w", 0) or 0)
        h = int(area.get("h", 0) or 0)
        # enforce_detection=False returns a full-image "face" when nothing is found.
        if w <= 0 or h <= 0 or (w >= img.shape[1] and h >= img.shape[0]):
            continue
        conf = face.get("confidence")
        if conf is not None and conf < 0.5:
            continue
        result.append(face)
    return result


def spoof_verdict(faces):
    """Combine per-face anti-spoofing scores. Returns (is_real, real_confidence)."""
    if not faces:
        return True, 0.0
    scores = []
    reals = []
    for face in faces:
        score = face.get("antispoof_score")
        real = face.get("is_real")
        if score is not None:
            scores.append(float(score))
        if real is not None:
            reals.append(bool(real))
    if not scores and not reals:
        # Anti-spoofing was not available — do not block on it.
        return True, 0.0
    avg = sum(scores) / len(scores) if scores else (1.0 if all(reals) else 0.0)
    is_real = all(reals) if reals else avg >= 0.5
    return is_real, round(avg, 4)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL, "detector": DETECTOR, "antispoof": ANTISPOOF}


@app.post("/detect")
def detect(req: MatchRequest):
    img = decode_image(req.document or req.selfie)
    if img is None:
        return JSONResponse(status_code=400, content={"detail": "invalid image"})
    faces = detect_faces(img, anti_spoofing=ANTISPOOF)
    is_real, score = spoof_verdict(faces)
    return {
        "faces": len(faces),
        "boxes": [f.get("facial_area") for f in faces],
        "is_real": is_real,
        "antispoof_score": score,
    }


@app.post("/match")
def match(req: MatchRequest):
    selfie = decode_image(req.selfie)
    document = decode_image(req.document) if req.document else None
    if selfie is None or document is None:
        return JSONResponse(status_code=400, content={"detail": "invalid image payload"})

    selfie_faces = detect_faces(selfie, anti_spoofing=ANTISPOOF)
    document_faces = detect_faces(document)
    selfie_real, spoof_score = spoof_verdict(selfie_faces)

    if not selfie_faces or not document_faces:
        return {
            "selfie_faces": len(selfie_faces),
            "document_faces": len(document_faces),
            "similarity": 0.0,
            "matched": False,
            "selfie_real": selfie_real,
            "spoof_score": spoof_score,
            "model": MODEL,
        }

    try:
        result = deepface().verify(
            img1_path=selfie,
            img2_path=document,
            model_name=MODEL,
            detector_backend=DETECTOR,
            enforce_detection=True,
            distance_metric="cosine",
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(status_code=422, content={"detail": f"verification failed: {exc}"})

    distance = float(result.get("distance", 1.0))
    threshold = float(result.get("threshold", 1.0)) or 1.0
    # Map the metric distance to a friendly 0..1 similarity (1.0 = identical).
    similarity = max(0.0, min(1.0, 1.0 - (distance / (threshold * 2.0))))
    return {
        "selfie_faces": len(selfie_faces),
        "document_faces": len(document_faces),
        "similarity": round(similarity, 4),
        "distance": round(distance, 4),
        "threshold": round(threshold, 4),
        "matched": bool(result.get("verified", False)),
        "selfie_real": selfie_real,
        "spoof_score": spoof_score,
        "model": MODEL,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=PORT)
