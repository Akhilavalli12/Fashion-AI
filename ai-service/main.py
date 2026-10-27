from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import analyzer

app = FastAPI(title="Fashion AI vision service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    return analyzer.analyze(await file.read())
