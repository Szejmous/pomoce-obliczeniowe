from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from modules import ugiecie_belki, worek_sniegu_przeszkoda, worek_sniegu_dach, wspornik, wyboczenie_ramy, chat

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def menu(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

app.include_router(ugiecie_belki.router, prefix="/ugiecie-belki")
app.include_router(worek_sniegu_przeszkoda.router, prefix="/worek-sniegu-przeszkoda")
app.include_router(worek_sniegu_dach.router, prefix="/worek-sniegu-dach")
app.include_router(wspornik.router, prefix="/wspornik")
app.include_router(wyboczenie_ramy.router, prefix="/wyboczenie-ramy")
app.include_router(chat.router, prefix="/chat")
