from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
async def wyboczenie_ramy(request: Request):
    return templates.TemplateResponse("wyboczenie_ramy.html", {"request": request})

@router.post("/calculate")
async def calculate_wyboczenie_ramy(data: dict):
    return {"message": "Współczynnik wyboczenia ramy - do zaimplementowania"}
