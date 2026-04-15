from fastapi import FastAPI
from contract_service import call_hello

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Backend running 🚀"}


@app.get("/hello/{name}")
def hello(name: str):
    return call_hello(name)