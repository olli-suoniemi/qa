from fastapi import Request, FastAPI
from .models import generate_response 

app = FastAPI()

@app.get("/")
async def main():
    return "POST a message with a JSON document that has a 'question' key."

@app.post("/")
async def ask_question(request: Request):
    data = await request.json()
    return {"response": generate_response(data["question"])}
