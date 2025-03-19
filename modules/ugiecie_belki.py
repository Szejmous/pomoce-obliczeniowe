from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json
import numpy as np
from pydantic import BaseModel

router = APIRouter()
templates = Jinja2Templates(directory="templates")

with open("przekroje.json", "r", encoding="utf-8") as file:
    przekroje = json.load(file)

E_default = 210e9
sigma_dop = 355

class BeamInput(BaseModel):
    L: float
    q: float
    P: float
    a: float
    E: float
    kategoria: str
    rozmiar: str
    os: str
    warunek: str
    tryb: str

@router.get("/", response_class=HTMLResponse)
async def ugiecie_belki(request: Request):
    kategorie = list(przekroje.keys())
    warunki_ugiecia = ["L/150", "L/200", "L/250", "L/300", "L/500"]
    return templates.TemplateResponse("ugiecie_belki.html", {
        "request": request,
        "kategorie": kategorie,
        "warunki_ugiecia": warunki_ugiecia,
        "przekroje": przekroje
    })

@router.post("/calculate")
async def calculate_beam(data: BeamInput):
    L, q, P, a = data.L, data.q * 1000, data.P * 1000, data.a
    E = data.E * 1e9
    try:
        I = przekroje[data.kategoria][data.rozmiar]["Iy" if data.os == "Iy" else "Iz"] * 1e-8
        dim = przekroje[data.kategoria][data.rozmiar]["h" if data.os == "Iy" else "b"] / 1000
    except KeyError:
        raise HTTPException(status_code=400, detail="Nieprawidłowy przekrój")

    # Definicje funkcji PRZED ich użyciem
    def oblicz_ugiecie_w_punkcie(x, L, q, P, a, E, I, tryb):
        v_q = v_P = 0
        if tryb == "wolna":
            if q != 0:
                v_q = -(q * x * (L**3 - 2 * L * x**2 + x**3)) / (24 * E * I)
            if P != 0 and 0 <= a <= L:
                b = L - a
                v_P = -(P * b * x * (L**2 - b**2 - x**2)) / (6 * E * I * L) if x <= a else \
                      -(P * a * (L - x) * (L**2 - a**2 - (L - x)**2)) / (6 * E * I * L)
        else:  # wspornik - powrót do wzoru ze skokiem
            if q != 0:
                v_q = -(q * x**2 * (6 * L**2 - 4 * L * x + x**2)) / (24 * E * I)
            if P != 0 and 0 <= a <= L:
                if x <= a:
                    v_P = -(P * a**2 * (3 * x - a)) / (6 * E * I)
                else:
                    v_P = -(P * x**2 * (3 * a - x)) / (6 * E * I)
        return v_q + v_P

    def oblicz_moment_w_punkcie(x, L, q, P, a, tryb):
        if tryb == "wolna":
            M_q = q * x * (L - x) / 2 if q != 0 else 0
            M_P = P * (L - a) * x / L if P != 0 and x <= a <= L else P * a * (L - x) / L if P != 0 and a < x <= L else 0
            return -(M_q + M_P) / 1000
        else:
            M_q = q * (L - x)**2 / 2 if q != 0 else 0
            M_P = P * (a - x) if P != 0 and x <= a <= L else 0
            return -(M_q + M_P) / 1000

    # Obliczenia ugięcia i momentów
    x_vals = np.linspace(0, L, 201).tolist()
    v_vals = [oblicz_ugiecie_w_punkcie(x, L, q, P, a, E, I, data.tryb) * 1000 for x in x_vals]
    m_vals = [oblicz_moment_w_punkcie(x, L, q, P, a, data.tryb) for x in x_vals]

    V_max = min(v_vals)
    M_max = abs(min(m_vals))
    denominator = int(data.warunek.split("/")[1])
    v_dop = L / denominator * 1000
    W = I / (dim / 2)
    M_dop = sigma_dop * 1e6 * W / 1e3
    sigma_max = M_max * 1e3 / W / 1e6
    wytężenie = (sigma_max / sigma_dop) * 100

    # Analiza profili
    profiles = []
    for profil, dane in przekroje[data.kategoria].items():
        I_prof = dane["Iy" if data.os == "Iy" else "Iz"] * 1e-8
        v_vals_prof = [oblicz_ugiecie_w_punkcie(x, L, q, P, a, E, I_prof, data.tryb) * 1000 for x in x_vals]
        v_max_prof = abs(min(v_vals_prof))
        profiles.append({"name": profil, "ugiecie": v_max_prof})

    profiles.sort(key=lambda x: x["ugiecie"])

    najlepszy_profil = None
    najlepszy_wykorzystanie = 0
    pierwszy_przekroczony = None
    najgorsze_wykorzystanie = float('inf')
    v_dop_mm = v_dop

    for profile in profiles:
        wykorzystanie = profile["ugiecie"] / v_dop_mm if v_dop_mm != 0 else 0
        if 0.1 <= wykorzystanie <= 1.0 and wykorzystanie > najlepszy_wykorzystanie:
            najlepszy_wykorzystanie = wykorzystanie
            najlepszy_profil = profile["name"]
        if wykorzystanie > 1.0 and wykorzystanie < najgorsze_wykorzystanie:
            najgorsze_wykorzystanie = wykorzystanie
            pierwszy_przekroczony = profile["name"]

    # Formatowanie wyników z procentowym wykorzystaniem
    najlepszy_profil_str = f"{najlepszy_profil} ({najlepszy_wykorzystanie:.2%})" if najlepszy_profil else "Brak profilu w zakresie 0.1–1.0"
    pierwszy_przekroczony_str = f"{pierwszy_przekroczony} ({najgorsze_wykorzystanie:.2%})" if pierwszy_przekroczony and najgorsze_wykorzystanie != float('inf') else "Brak profilu powyżej 1.0"

    return {
        "v_vals": v_vals,
        "m_vals": m_vals,
        "x_vals": x_vals,
        "V_max": V_max,
        "M_max": M_max,
        "v_dop": v_dop,
        "wytężenie": wytężenie,
        "profile": {k: v for k, v in przekroje[data.kategoria].items()},
        "najlepszy_profil": najlepszy_profil_str,
        "pierwszy_przekroczony": pierwszy_przekroczony_str
    }