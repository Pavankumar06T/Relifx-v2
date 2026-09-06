import sys
import uvicorn
from chromadb.app import app
from fastapi import Request

@app.get("/api/v1/tenants/{tenant}")
@app.get("/api/v2/tenants/{tenant}")
async def mock_tenant(tenant: str):
    return {"name": tenant}

@app.get("/api/v1/tenants/{tenant}/databases/{database}")
@app.get("/api/v2/tenants/{tenant}/databases/{database}")
async def mock_database(tenant: str, database: str):
    return {"name": database, "tenant": tenant}

# Middleware stripping tenant/database prefix from JS SDK queries to match python chromadb API
@app.middleware("http")
async def rewrite_v2_to_v1(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/v2/tenants/") and "/databases/" in path:
        parts = path.split("/databases/")
        if len(parts) > 1:
            db_and_rest = parts[1].split("/", 1)
            rest = "/" + db_and_rest[1] if len(db_and_rest) > 1 else ""
            request.scope["path"] = "/api/v1" + rest
    elif path.startswith("/api/v2/"):
        request.scope["path"] = path.replace("/api/v2/", "/api/v1/")
    response = await call_next(request)
    return response

if __name__ == "__main__":
    print("========================================================================================")
    print(" CHROMADB VECTOR SERVER READY (WITH V1/V2 & TENANT PATH REWRITER ON PORT 8000)")
    print("========================================================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
