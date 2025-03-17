from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from modules import ugiecie_belki, chat  # Importujemy moduły

app = FastAPI()

# Montowanie folderu statycznego
app.mount("/static", StaticFiles(directory="static"), name="static")

# Montowanie routerów z modułów
app.include_router(ugiecie_belki.router, prefix="/ugiecie-belki")
app.include_router(chat.router, prefix="/chat")

@app.get("/")
async def root():
    return {"message": "Witaj w aplikacji obliczeniowej!"}
