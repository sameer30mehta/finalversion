from fastapi import FastAPI, UploadFile, File, Form, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image
import torch
import io
import time

app = FastAPI()

# Enable CORS so the React frontend can talk to the Python Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Explicitly command torch to use CUDA (User's RTX 5050 Blackwell)
device = 0 if torch.cuda.is_available() else -1
print(f"PropScore Vision Core AI booting... Target Device: {'CUDA GPU NATIVE' if device == 0 else 'CPU FALLBACK'}")

# Load the authentic OwlViT vision transform via HuggingFace Native PyTorch bindings
vision_agent = pipeline(
    "zero-shot-object-detection",
    model="google/owlvit-base-patch32",
    device=device
)

@app.post("/scan")
async def scan_image(request: Request):
    start_time = time.time()
    
    # Handle either JSON URL or Multipart Binary
    content_type = request.headers.get('content-type', '')
    if 'application/json' in content_type:
        data = await request.json()
        import urllib.request
        req = urllib.request.Request(data['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            image = Image.open(io.BytesIO(response.read())).convert("RGB")
    else:
        form = await request.form()
        file = form.get("file")
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    
    # Run the tensor inference physically on the GPU
    # Labels target exactly what a collateral underwriter is looking for
    results = vision_agent(image, candidate_labels=["crack in wall", "concrete fissure", "wall damage", "stain"])
    
    width, height = image.size
    
    # Serialize the output for the React frontend
    serialized = []
    # Sort results by confidence
    results.sort(key=lambda x: x['score'], reverse=True)
    
    for r in results[:2]: # Only show top 2 most confident boxes so UI isn't cluttered
        # Filter low confidence organically (OwlViT zero-shot scores are naturally very low)
        if r['score'] > 0.01:
            serialized.append({
                "label": r['label'],
                "score": r['score'],
                "top_pct": (r['box']['ymin'] / height) * 100,
                "left_pct": (r['box']['xmin'] / width) * 100,
                "width_pct": ((r['box']['xmax'] - r['box']['xmin']) / width) * 100,
                "height_pct": ((r['box']['ymax'] - r['box']['ymin']) / height) * 100
            })
            
    print(f"Scan complete in {round(time.time() - start_time, 2)}s. Detections: {len(serialized)}")
    return {"results": serialized}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
