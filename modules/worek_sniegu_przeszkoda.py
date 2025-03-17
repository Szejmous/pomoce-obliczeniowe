from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def worek_sniegu_przeszkoda(request: Request):
    return templates.TemplateResponse("worek_sniegu_przeszkoda.html", {"request": request})

@router.post("/calculate")
async def calculate_worek_przeszkoda(data: dict):
    return {"message": "Worek śniegu przy przeszkodzie - do zaimplementowania"}
