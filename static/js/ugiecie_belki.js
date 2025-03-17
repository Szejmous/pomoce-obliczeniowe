let ugiecieChart, momentChart;

document.addEventListener("DOMContentLoaded", () => {
    updateRozmiary();
});

function updateRozmiary() {
    const kategoria = document.getElementById("kategoria").value;
    const rozmiarSelect = document.getElementById("rozmiar");
    rozmiarSelect.innerHTML = "";
    const przekroje = {{ przekroje | tojson }};
    const rozmiary = Object.keys(przekroje[kategoria]);
    rozmiary.forEach(rozmiar => {
        const option = document.createElement("option");
        option.value = rozmiar;
        option.textContent = rozmiar;
        rozmiarSelect.appendChild(option);
    });
}

async function calculate() {
    const L = parseFloat(document.getElementById("L").value);
    const q = parseFloat(document.getElementById("q").value);
    const P = parseFloat(document.getElementById("P").value);
    const a = parseFloat(document.getElementById("a").value);
    const E = parseFloat(document.getElementById("E").value);
    const kategoria = document.getElementById("kategoria").value;
    const rozmiar = document.getElementById("rozmiar").value;
    const os = document.getElementById("os").value;
    const warunek = document.getElementById("warunek").value;
    const tryb = document.getElementById("tryb").value;

    const response = await fetch("/ugiecie-belki/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ L, q, P, a, E, kategoria, rozmiar, os, warunek, tryb })
    });
    const data = await response.json();

    // Utwórz lub zaktualizuj wykres ugięcia
    if (ugiecieChart) ugiecieChart.destroy();
    ugiecieChart = new Chart(document.getElementById("ugiecieChart").getContext("2d"), {
        type: "line",
        data: {
            labels: data.x_vals,
            datasets: [{
                label: "Ugięcie [mm]",
                data: data.v_vals,
                borderColor: "blue",
                fill: false
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: "Długość belki [m]" } },
                y: { title: { display: true, text: "Ugięcie [mm]" } }
            },
            plugins: {
                annotation: {
                    annotations: [
                        // Linia wymiarowa dla długości belki (L)
                        {
                            type: "line",
                            xMin: 0,
                            xMax: L,
                            yMin: Math.min(...data.v_vals) - 5,
                            yMax: Math.min(...data.v_vals) - 5,
                            borderColor: "black",
                            borderWidth: 2,
                            label: {
                                content: `L = ${L} m`,
                                enabled: true,
                                position: "center",
                                backgroundColor: "rgba(0,0,0,0.7)",
                                color: "white"
                            },
                            arrowHeads: {
                                start: { enabled: true, fill: true },
                                end: { enabled: true, fill: true }
                            }
                        },
                        // Linia wymiarowa dla siły P (jeśli P != 0)
                        ...(P !== 0 ? [{
                            type: "line",
                            xMin: a,
                            xMax: a,
                            yMin: 0,
                            yMax: 10,
                            borderColor: "red",
                            borderWidth: 2,
                            label: {
                                content: `P = ${P} kN`,
                                enabled: true,
                                position: "center",
                                backgroundColor: "rgba(255,0,0,0.7)",
                                color: "white"
                            },
                            arrowHeads: {
                                end: { enabled: true, fill: true }
                            }
                        }] : [])
                    ]
                }
            }
        }
    });

    // Utwórz lub zaktualizuj wykres momentu
    if (momentChart) momentChart.destroy();
    momentChart = new Chart(document.getElementById("momentChart").getContext("2d"), {
        type: "line",
        data: {
            labels: data.x_vals,
            datasets: [{
                label: "Moment [kNm]",
                data: data.m_vals,
                borderColor: "red",
                fill: false
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: "Długość belki [m]" } },
                y: { title: { display: true, text: "Moment [kNm]" } }
            }
        }
    });

    // Wyświetl wyniki
    document.getElementById("v-max").textContent = data.V_max.toFixed(2);
    document.getElementById("v-dop").textContent = data.v_dop.toFixed(2);
    document.getElementById("m-max").textContent = data.M_max.toFixed(2);
    document.getElementById("wytrzymalosc").textContent = data.wytężenie.toFixed(2);

    // Najlepszy profil i pierwszy przekroczony
    const profile = findBestProfile(data.profile, data.V_max, data.v_dop, os, L, q, P, a, E, tryb);
    document.getElementById("najlepszy").textContent = profile.najlepszy || "-";
    document.getElementById("przekroczony").textContent = profile.przekroczony || "-";
}

// Funkcja do obliczania ugięcia w punkcie (z backendu)
function obliczUgiecieWPunkcie(x, L, q, P, a, E, I, tryb) {
    let v_q = 0, v_P = 0;
    if (tryb === "wolna") {
        if (q !== 0) {
            v_q = -(q * x * (L**3 - 2 * L * x**2 + x**3)) / (24 * E * I);
        }
        if (P !== 0 && 0 <= a && a <= L) {
            const b = L - a;
            if (x <= a) {
                v_P = -(P * b * x * (L**2 - b**2 - x**2)) / (6 * E * I * L);
            } else {
                v_P = -(P * a * (L - x) * (L**2 - a**2 - (L - x)**2)) / (6 * E * I * L);
            }
        }
    } else {
        if (q !== 0) {
            v_q = -(q * x**2 * (6 * L**2 - 4 * L * x + x**2)) / (24 * E * I);
        }
        if (P !== 0 && 0 <= a && a <= L) {
            if (x <= a) {
                v_P = -(P * a**2 * (3 * x - a)) / (6 * E * I);
            } else {
                v_P = -(P * x**2 * (3 * a - x)) / (6 * E * I);
            }
        }
    }
    return (v_q + v_P) * 1000; // Przelicz na mm
}

// Funkcja do znajdowania najlepszego profilu i pierwszego przekroczonego na podstawie ugięcia
function findBestProfile(profiles, currentVmax, v_dop, os, L, q, P, a, E, tryb) {
    const profileEntries = Object.entries(profiles);

    // Oblicz ugięcie dla każdego profilu
    const profilesWithUgiecie = profileEntries.map(([nazwa, dane]) => {
        const I = dane[os] * 1e-8; // Moment bezwładności w wybranej osi
        const x_vals = Array.from({ length: 201 }, (_, i) => (i / 200) * L); // Tak jak w backendzie
        const v_vals = x_vals.map(x => obliczUgiecieWPunkcie(x, L, q * 1000, P * 1000, a, E * 1e9, I, tryb));
        const V_max = Math.min(...v_vals); // Maksymalne ugięcie (najmniejsza wartość, bo ugięcie jest ujemne)
        return { nazwa, V_max };
    });

    // Sortuj profile według ugięcia (od najmniejszego do największego, czyli od największego V_max do najmniejszego)
    profilesWithUgiecie.sort((a, b) => b.V_max - a.V_max);

    let najlepszy = null;
    let przekroczony = null;

    // Znajdź najlepszy i przekroczony na podstawie ugięcia
    for (const { nazwa, V_max } of profilesWithUgiecie) {
        // Najlepszy: pierwszy profil, gdzie |V_max| <= v_dop (ugięcie w mm, więc porównujemy wartości bezwzględne)
        if (!najlepszy && Math.abs(V_max) <= v_dop) {
            najlepszy = nazwa;
        }
        // Przekroczony: pierwszy profil, gdzie |V_max| > v_dop
        if (!przekroczony && Math.abs(V_max) > v_dop) {
            przekroczony = nazwa;
        }
    }

    return { najlepszy, przekroczony };
}
