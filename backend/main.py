from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, engine, SessionLocal
from seed import seed_if_empty
from routers import patients, sessions, dashboard, gaze, reports

Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    seed_if_empty(db)

app = FastAPI(title="EyeCog API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(sessions.router)
app.include_router(dashboard.router)
app.include_router(gaze.router)
app.include_router(reports.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
