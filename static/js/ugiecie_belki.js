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
    const profile = findBestProfile(data.profile, data.wytężenie);
    document.getElementById("najlepszy").textContent = profile.najlepszy || "-";
    document.getElementById("przekroczony").textContent = profile.przekroczony || "-";
}

// Funkcja do znajdowania najlepszego profilu i pierwszego przekroczonego
function findBestProfile(profile, wytezenie) {
    const profileEntries = Object.entries(profile);
    const sortedProfiles = profileEntries.sort((a, b) => {
        const IyA = a[1].Iy || 0;
        const IzA = a[1].Iz || 0;
        const IyB = b[1].Iy || 0;
        const IzB = b[1].Iz || 0;
        return (IyA + IzA) - (IyB + IzB); // Sortuj według sumy momentów bezwładności
    });

    let najlepszy = null;
    let przekroczony = null;

    for (const [nazwa, dane] of sortedProfiles) {
        const Iy = dane.Iy || 0;
        const Iz = dane.Iz || 0;
        const momentBezwladnosci = Iy + Iz; // Uproszczona metryka
        if (!przekroczony && wytezenie > 100) {
            przekroczony = nazwa; // Pierwszy profil, jeśli wytężenie przekracza 100%
        }
        if (!najlepszy && wytezenie <= 100) {
            najlepszy = nazwa; // Pierwszy profil, który spełnia warunek wytężenia
        }
    }

    return { najlepszy, przekroczony };
}
