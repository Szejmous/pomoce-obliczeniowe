from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def worek_sniegu_dach(request: Request):
    return templates.TemplateResponse("worek_sniegu_dach.html", {"request": request})

@router.post("/calculate")
async def calculate_worek_sniegu_dach(data: dict):
    return {"message": "Worek śniegu przy dachu - do zaimplementowania"}
