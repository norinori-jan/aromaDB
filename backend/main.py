from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import os

app = FastAPI(title="AromaDB API", version="0.1.0")

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store (replace with a real DB later)
fragrance_store: list[dict] = []


class Ratings(BaseModel):
    sweetness: int
    heaviness: int
    persistence: int
    floral: int
    freshness: int


@app.get("/")
def root():
    return {"message": "AromaDB API is running"}


@app.get("/api/fragrances")
def list_fragrances():
    return {"fragrances": fragrance_store}


@app.post("/api/fragrances", status_code=201)
async def create_fragrance(
    name: str = Form(...),
    sweetness: int = Form(...),
    heaviness: int = Form(...),
    persistence: int = Form(...),
    floral: int = Form(...),
    freshness: int = Form(...),
    image: Optional[UploadFile] = File(None),
):
    image_filename = None
    if image and image.filename:
        # Sanitize: keep only the base filename to prevent path traversal
        safe_name = os.path.basename(image.filename)
        ext = os.path.splitext(safe_name)[1].lower()
        image_filename = f"{uuid.uuid4()}{ext}"

    entry = {
        "id": str(uuid.uuid4()),
        "name": name,
        "image_filename": image_filename,
        "ratings": {
            "sweetness": sweetness,
            "heaviness": heaviness,
            "persistence": persistence,
            "floral": floral,
            "freshness": freshness,
        },
    }
    fragrance_store.append(entry)
    return entry
