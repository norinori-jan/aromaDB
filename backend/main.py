from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uuid
import os
import json
import base64
import urllib.request
import urllib.error

app = FastAPI(title="AromaDB API", version="0.1.0")

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store (replace with a real DB later)
fragrance_store: list[dict] = []


class FragranceCreateResponse(BaseModel):
    id: str
    name: str
    image_filename: Optional[str]
    ratings: dict[str, int] = Field(default_factory=dict)


class NameExtractionResponse(BaseModel):
    name: str
    source: str


@app.get("/")
def root():
    return {"message": "AromaDB API is running"}


@app.get("/api/fragrances")
def list_fragrances():
    return {"fragrances": fragrance_store}


def _coerce_ratings(raw: dict) -> dict[str, int]:
    cleaned: dict[str, int] = {}
    for key, value in raw.items():
        if not isinstance(key, str):
            continue
        try:
            num = round(float(value))
        except (TypeError, ValueError):
            continue
        cleaned[key] = max(1, min(10, num))
    return cleaned


def _extract_name_with_gemini(image_bytes: bytes, mime_type: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "You are an OCR assistant for fragrance labels. "
                            "Read the image and return only the fragrance ingredient name. "
                            "No explanations, no quotes, one short line. "
                            "If uncertain, return the most likely proper name."
                        )
                    },
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": image_b64,
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 40,
        },
    }

    req = urllib.request.Request(
        url=url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {detail}") from err
    except urllib.error.URLError as err:
        raise HTTPException(status_code=502, detail="Unable to reach Gemini API") from err

    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, TypeError) as err:
        raise HTTPException(status_code=502, detail="Invalid response from Gemini API") from err

    if not text:
        raise HTTPException(status_code=422, detail="No name extracted from image")

    return text.splitlines()[0][:120].strip(" \"'")


@app.post("/api/fragrances", status_code=201, response_model=FragranceCreateResponse)
async def create_fragrance(
    name: str = Form(...),
    ratings_json: Optional[str] = Form(None),
    sweetness: Optional[int] = Form(None),
    heaviness: Optional[int] = Form(None),
    persistence: Optional[int] = Form(None),
    floral: Optional[int] = Form(None),
    freshness: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    image_filename = None
    if image and image.filename:
        # Sanitize: keep only the base filename to prevent path traversal
        safe_name = os.path.basename(image.filename)
        ext = os.path.splitext(safe_name)[1].lower()
        image_filename = f"{uuid.uuid4()}{ext}"

    ratings: dict[str, int] = {}
    if ratings_json:
        try:
            decoded = json.loads(ratings_json)
        except json.JSONDecodeError as err:
            raise HTTPException(status_code=422, detail="ratings_json must be valid JSON") from err
        if not isinstance(decoded, dict):
            raise HTTPException(status_code=422, detail="ratings_json must be an object")
        ratings = _coerce_ratings(decoded)
    else:
        fallback = {
            "sweetness": sweetness,
            "heaviness": heaviness,
            "persistence": persistence,
            "floral": floral,
            "freshness": freshness,
        }
        ratings = _coerce_ratings(fallback)

    if not ratings:
        raise HTTPException(status_code=422, detail="At least one rating is required")

    entry = {
        "id": str(uuid.uuid4()),
        "name": name,
        "image_filename": image_filename,
        "ratings": ratings,
    }
    fragrance_store.append(entry)
    return entry


@app.post("/api/extract-name", response_model=NameExtractionResponse)
async def extract_name_from_label(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Image file is required")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Uploaded image is empty")

    name = _extract_name_with_gemini(image_bytes=image_bytes, mime_type=image.content_type)
    return {"name": name, "source": "gemini"}
