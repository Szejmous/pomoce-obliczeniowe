// Funkcja aktualizująca listę rozmiaró profili po wybraniu kategorii
function updateRozmiary() {
    const kategoria = document.getElementById("kategoria").value;
    const rozmiarSelect = document.getElementById("rozmiar");
    rozmiarSelect.innerHTML = "";
    Object.keys(przekroje[kategoria]).forEach(rozmiar => {
        const option = document.createElement("option");
        option.value = rozmiar;
        option.text = rozmiar;
        if (rozmiar === "IPE 200") option.selected = true;
        rozmiarSelect.appendChild(option);
    });
    updateVisualization();
    calculateBeam(); // Automatyczne obliczenia po zmianie kategorii
}

// Funkcja aktualizująca wizualizację belki na canvasie
function updateVisualization() {
    const canvas = document.getElementById("beamCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pobranie rzeczywistej szerokości canvasu i obliczenie skali dla osi x
    const canvasWidth = canvas.width;
    const baseWidth = 600; // Nowa bazowa szerokość (zwiększona o 1,5 z 400px)
    const xScale = canvasWidth / baseWidth;

    const belka_x_start = 50 * xScale;
    const belka_x_end = 350 * xScale;
    const belka_y = 200; // Stała wysokość, bez skalowania w pionie
    const belka_length_px = belka_x_end - belka_x_start;

    ctx.lineWidth = 3 * xScale;
    ctx.beginPath();
    ctx.moveTo(belka_x_start, belka_y);
    ctx.lineTo(belka_x_end, belka_y);
    ctx.stroke();

    const L = parseFloat(document.getElementById("L").value) || 0;
    const q = parseFloat(document.getElementById("q").value) || 0;
    const P = parseFloat(document.getElementById("P").value) || 0;
    const a = parseFloat(document.getElementById("a").value) || 0;
    const tryb = document.querySelector("input[name='tryb']:checked").value;

    if (tryb === "wolna") {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.moveTo(belka_x_start - 10 * xScale, belka_y + 10);
        ctx.lineTo(belka_x_start + 10 * xScale, belka_y + 10);
        ctx.lineTo(belka_x_start, belka_y);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(belka_x_end - 10 * xScale, belka_y + 10);
        ctx.lineTo(belka_x_end + 10 * xScale, belka_y + 10);
        ctx.lineTo(belka_x_end, belka_y);
        ctx.fill();

        // Reakcje podporowe dla belki swobodnie podpartej - tylko podpisy, podniesione
        if (L > 0) {
            const Va = q * L / 2 + (P > 0 ? P * (L - a) / L : 0);
            const Vb = q * L / 2 + (P > 0 ? P * a / L : 0);
            ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
            ctx.fillText(`Va=${Va.toFixed(2)} kN`, belka_x_start, belka_y + 30);
            ctx.fillText(`Vb=${Vb.toFixed(2)} kN`, belka_x_end, belka_y + 30);
        }
    } else {
        ctx.lineWidth = 3 * xScale;
        ctx.beginPath();
        ctx.moveTo(belka_x_start, belka_y - 20);
        ctx.lineTo(belka_x_start, belka_y + 20);
        ctx.stroke();
        ctx.lineWidth = 3 * xScale;
        for (let i = -15; i <= 15; i += 10) {
            ctx.beginPath();
            ctx.moveTo(belka_x_start - 10 * xScale, belka_y + i - 5);
            ctx.lineTo(belka_x_start, belka_y + i + 5);
            ctx.stroke();
        }

        // Reakcja i moment dla wspornika - tylko podpisy, podniesione
        if (L > 0) {
            const Va = q * L + P;
            const Ma = q * L * L / 2 + P * a;
            ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
            ctx.fillText(`Va=${Va.toFixed(2)} kN`, belka_x_start, belka_y + 30);
            ctx.fillText(`Ma=${Ma.toFixed(2)} kNm`, belka_x_start + 40 * xScale, belka_y + 10);
        }
    }

    if (q > 0) {
        const arrowTops = [];
        ctx.lineWidth = 2 * xScale;
        for (let i = 0; i < 10; i++) {
            const x = belka_x_start + (i + 0.5) * belka_length_px / 10;
            ctx.beginPath();
            ctx.moveTo(x, belka_y - 30);
            ctx.lineTo(x, belka_y);
            ctx.stroke();
            ctx.lineTo(x - 5 * xScale, belka_y - 5);
            ctx.moveTo(x, belka_y);
            ctx.lineTo(x + 5 * xScale, belka_y - 5);
            ctx.stroke();
            arrowTops.push([x, belka_y - 30]);
        }
        ctx.beginPath();
        for (let i = 0; i < arrowTops.length - 1; i++) {
            ctx.moveTo(...arrowTops[i]);
            ctx.lineTo(...arrowTops[i + 1]);
        }
        ctx.stroke();
        ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
        ctx.fillText(`${q} kN/m`, belka_x_start + belka_length_px / 2, belka_y - 50);
    }

    if (P > 0 && L > 0 && a <= L) {
        const x_pos = belka_x_start + (a / L) * belka_length_px;
        ctx.lineWidth = 2 * xScale;
        ctx.beginPath();
        ctx.moveTo(x_pos, belka_y - 70);
        ctx.lineTo(x_pos, belka_y);
        ctx.stroke();
        ctx.lineTo(x_pos - 5 * xScale, belka_y - 5);
        ctx.moveTo(x_pos, belka_y);
        ctx.lineTo(x_pos + 5 * xScale, belka_y - 5);
        ctx.stroke();
        ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
        ctx.fillText(`${P} kN`, x_pos, belka_y - 90);
    }

    ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
    ctx.fillText(`${document.getElementById("rozmiar").value}`, belka_x_start + belka_length_px / 2, belka_y + 30);

    // Linie wymiarowe
    const dim_y1 = belka_y + 90;
    const dim_y2 = belka_y + 120;

    function rysujZnak(x, y, kierunek) {
        ctx.lineWidth = 2 * xScale;
        ctx.beginPath();
        if (kierunek === "lewo") {
            ctx.moveTo(x, y - 5);
            ctx.lineTo(x + 10 * xScale, y + 5);
        } else {
            ctx.moveTo(x - 10 * xScale, y - 5);
            ctx.lineTo(x, y + 5);
        }
        ctx.stroke();
    }

    ctx.lineWidth = 1 * xScale;
    if (P > 0 && L > 0 && a <= L) {
        const x_pos = belka_x_start + (a / L) * belka_length_px;
        ctx.beginPath();
        ctx.moveTo(belka_x_start, dim_y1);
        ctx.lineTo(x_pos, dim_y1);
        ctx.stroke();
        rysujZnak(belka_x_start, dim_y1, "lewo");
        rysujZnak(x_pos, dim_y1, "prawo");
        ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
        ctx.fillText(`${a.toFixed(2)} m`, (belka_x_start + x_pos) / 2, dim_y1 - 10);

        ctx.beginPath();
        ctx.moveTo(x_pos, dim_y1);
        ctx.lineTo(belka_x_end, dim_y1);
        ctx.stroke();
        rysujZnak(x_pos, dim_y1, "lewo");
        rysujZnak(belka_x_end, dim_y1, "prawo");
        ctx.fillText(`${(L - a).toFixed(2)} m`, (x_pos + belka_x_end) / 2, dim_y1 - 10);

        ctx.beginPath();
        ctx.moveTo(belka_x_start, dim_y2);
        ctx.lineTo(belka_x_end, dim_y2);
        ctx.stroke();
        rysujZnak(belka_x_start, dim_y2, "lewo");
        rysujZnak(belka_x_end, dim_y2, "prawo");
        ctx.fillText(`L = ${L.toFixed(2)} m`, belka_x_start + belka_length_px / 2, dim_y2 + 15);
    } else {
        ctx.beginPath();
        ctx.moveTo(belka_x_start, dim_y2);
        ctx.lineTo(belka_x_end, dim_y2);
        ctx.stroke();
        rysujZnak(belka_x_start, dim_y2, "lewo");
        rysujZnak(belka_x_end, dim_y2, "prawo");
        ctx.font = "10px Arial"; // Czcionka bez skalowania w pionie
        ctx.fillText(`L = ${L.toFixed(2)} m`, belka_x_start + belka_length_px / 2, dim_y2 + 15);
    }
}

// Główna funkcja obliczająca ugięcie i inne parametry
async function calculateBeam() {
    const data = {
        L: parseFloat(document.getElementById("L").value) || 0,
        q: parseFloat(document.getElementById("q").value) || 0,
        P: parseFloat(document.getElementById("P").value) || 0,
        a: parseFloat(document.getElementById("a").value) || 0,
        E: parseFloat(document.getElementById("E").value) || 0,
        kategoria: document.getElementById("kategoria").value,
        rozmiar: document.getElementById("rozmiar").value,
        os: document.querySelector("input[name='os']:checked").value,
        warunek: document.getElementById("warunek").value,
        tryb: document.querySelector("input[name='tryb']:checked").value
    };

    try {
        const response = await fetch("/ugiecie-belki/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        const rzeczywiste = Math.round(Math.abs(result.V_max));
        const dopuszczalne = Math.round(result.v_dop);
        const wytezenie = result.wytężenie.toFixed(2);
        const moment = result.M_max.toFixed(2);

        const ugieciePrzekroczone = rzeczywiste > dopuszczalne;
        const nosnoscPrzekroczona = wytezenie > 100;

        // Wyświetlanie wyników z kolorowaniem
        document.getElementById("rzeczywiste").innerText = `Rzeczywiste ugięcie: ${rzeczywiste} mm`;
        document.getElementById("rzeczywiste").style.color = ugieciePrzekroczone ? "red" : "green";
        document.getElementById("dopuszczalne").innerText = `Dopuszczalne ugięcie: ${dopuszczalne} mm (${data.warunek})`;
        document.getElementById("dopuszczalne").style.color = ugieciePrzekroczone ? "red" : "green";
        document.getElementById("moment").innerText = `Maksymalny moment: ${moment} kNm`;
        document.getElementById("moment").style.color = nosnoscPrzekroczona ? "red" : "green";
        document.getElementById("wytezenie").innerText = `Wytężenie przekroju: ${wytezenie}%`;
        document.getElementById("wytezenie").style.color = nosnoscPrzekroczona ? "red" : "green";

        // Wyświetlanie najlepszego profilu i pierwszego przekroczonego
        document.getElementById("optymalny").innerText = `Najlepszy profil: ${result.najlepszy_profil || 'Brak danych'}`;
        document.getElementById("przekroczony").innerText = `Pierwszy przekroczony: ${result.pierwszy_przekroczony || 'Brak danych'}`;

        // Wykresy
        Plotly.newPlot("ugieciePlot", [{
            x: result.x_vals,
            y: result.v_vals,
            type: "scatter",
            mode: "lines",
            name: "Ugięcie (mm)",
            line: { color: ugieciePrzekroczone ? "red" : "green" }
        }, {
            x: result.x_vals,
            y: Array(result.x_vals.length).fill(-result.v_dop),
            type: "scatter",
            mode: "lines",
            name: `Dop. ugięcie (${data.warunek})`,
            line: { color: "red", dash: "dash" }
        }], {
            title: "Wykres ugięcia",
            xaxis: { title: "Położenie x [m]" },
            yaxis: { title: "Ugięcie [mm]" }
        });

        Plotly.newPlot("momentPlot", [{
            x: result.x_vals,
            y: result.m_vals,
            type: "scatter",
            mode: "lines",
            name: "Moment (kNm)",
            line: { color: "blue" }
        }], {
            title: "Wykres momentów zginających",
            xaxis: { title: "Położenie x [m]" },
            yaxis: { title: "Moment [kNm]" }
        });
    } catch (error) {
        console.error("Błąd obliczeń:", error);
        document.getElementById("optymalny").innerText = `Najlepszy profil: Błąd`;
        document.getElementById("przekroczony").innerText = `Pierwszy przekroczony: Błąd`;
    }
}

// Inicjalizacja i dodanie zdarzeń
window.onload = () => {
    updateRozmiary();
    updateVisualization();
    calculateBeam();

    // Dodanie zdarzeń oninput dla wszystkich pól
    ["L", "q", "P", "a", "E"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            updateVisualization();
            calculateBeam();
        });
    });
    document.getElementById("kategoria").addEventListener("change", () => {
        updateRozmiary();
        calculateBeam();
    });
    document.getElementById("rozmiar").addEventListener("change", () => {
        updateVisualization();
        calculateBeam();
    });
    document.getElementById("warunek").addEventListener("change", calculateBeam);
    document.querySelectorAll("input[name='tryb']").forEach(input => {
        input.addEventListener("change", () => {
            updateVisualization();
            calculateBeam();
        });
    });
    document.querySelectorAll("input[name='os']").forEach(input => {
        input.addEventListener("change", calculateBeam);
    });
};