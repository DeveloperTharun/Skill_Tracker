import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from . import models  # noqa: F401  (registers tables on Base.metadata)
from .database import Base, engine
from .routers import admin, ai, auth, certificates, exam, owner, slots, student

Base.metadata.create_all(engine)


def _add_missing_columns() -> None:
    """create_all never alters existing tables, so add columns introduced after the database was made."""
    if "slot_id" not in {c["name"] for c in inspect(engine).get_columns("exam_keys")}:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE exam_keys ADD COLUMN slot_id INTEGER REFERENCES slots(id)"))


_add_missing_columns()

app = FastAPI(title="SkillTrack API")
app.add_middleware(
    CORSMiddleware,
    # Local development: the Vite dev server may pick any free port (5173, 5174, ...)
    # Deployed frontend URL(s), comma-separated, e.g. CORS_ORIGINS=https://skilltrack.onrender.com
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(exam.router)
app.include_router(owner.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(slots.router)
app.include_router(certificates.router)


@app.get("/health")
def health():
    return {"status": "ok"}
