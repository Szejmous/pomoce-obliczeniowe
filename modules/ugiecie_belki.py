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
        else:
            if q != 0:
                v_q = -(q * x**2 * (6 * L**2 - 4 * L * x + x**2)) / (24 * E * I)
            if P != 0 and 0 <= a <= L:
                v_P = -(P * a**2 * (3 * x - a)) / (6 * E * I) if x <= a else \
                      -(P * x**2 * (3 * a - x)) / (6 * E * I)
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

    # Obliczenia ugięcia i momentu
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

    # Obliczanie najlepszego i pierwszego przekroczonego profilu
    def find_best_profile(profiles, V_max, v_dop, os, L, q, P, a, E, tryb):
        profiles_with_ugiecie = []
        for nazwa, dane in profiles.items():
            I_profile = dane[os] * 1e-8
            dim_profile = dane["h" if os == "Iy" else "b"] / 1000
            v_vals_profile = [oblicz_ugiecie_w_punkcie(x, L, q, P, a, E, I_profile, tryb) * 1000 for x in x_vals]
            V_max_profile = min(v_vals_profile)
            profiles_with_ugiecie.append({"nazwa": nazwa, "V_max": V_max_profile})

        # Sortuj według ugięcia (od najmniejszego do największego, czyli od największego V_max do najmniejszego)
        profiles_with_ugiecie.sort(key=lambda x: x["V_max"], reverse=True)

        najlepszy = None
        przekroczony = None
        for profile in profiles_with_ugiecie:
            if not najlepszy and abs(profile["V_max"]) <= v_dop:
                najlepszy = profile["nazwa"]
            if not przekroczony and abs(profile["V_max"]) > v_dop:
                przekroczony = profile["nazwa"]
            if najlepszy and przekroczony:
                break

        return {"najlepszy": najlepszy, "przekroczony": przekroczony}

    profile_result = find_best_profile(przekroje[data.kategoria], V_max, v_dop, data.os, L, q, P, a, E, data.tryb)

    return {
        "v_vals": v_vals,
        "m_vals": m_vals,
        "x_vals": x_vals,
        "V_max": V_max,
        "M_max": M_max,
        "v_dop": v_dop,
        "wytężenie": wytężenie,
        "profile": {k: v for k, v in przekroje[data.kategoria].items()},
        "najlepszy": profile_result["najlepszy"],
        "przekroczony": profile_result["przekroczony"]
    }
