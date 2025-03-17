from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def wspornik(request: Request):
    return templates.TemplateResponse("wspornik.html", {"request": request})

@router.post("/calculate")
async def calculate_wspornik(data: dict):
    return {"message": "Wymiarowanie wspornika - do zaimplementowania"}
