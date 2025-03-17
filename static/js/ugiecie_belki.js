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
}

function updateVisualization() {
    const canvas = document.getElementById("beamCanvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const belka_x_start = 50, belka_x_end = 350, belka_y = 200;
    const belka_length_px = belka_x_end - belka_x_start;
    ctx.lineWidth = 4;
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
        ctx.moveTo(belka_x_start - 10, belka_y + 10);
        ctx.lineTo(belka_x_start + 10, belka_y + 10);
        ctx.lineTo(belka_x_start, belka_y);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(belka_x_end - 10, belka_y + 10);
        ctx.lineTo(belka_x_end + 10, belka_y + 10);
        ctx.lineTo(belka_x_end, belka_y);
        ctx.fill();
    } else {
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(belka_x_start, belka_y - 20);
        ctx.lineTo(belka_x_start, belka_y + 20);
        ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = -15; i <= 15; i += 10) {
            ctx.beginPath();
            ctx.moveTo(belka_x_start - 10, belka_y + i - 5);
            ctx.lineTo(belka_x_start, belka_y + i + 5);
            ctx.stroke();
        }
    }

    if (q > 0) {
        const arrowTops = [];
        for (let i = 0; i < 10; i++) {
            const x = belka_x_start + (i + 0.5) * belka_length_px / 10;
            ctx.beginPath();
            ctx.moveTo(x, belka_y - 30);
            ctx.lineTo(x, belka_y);
            ctx.stroke();
            ctx.lineTo(x - 5, belka_y - 5);
            ctx.moveTo(x, belka_y);
            ctx.lineTo(x + 5, belka_y - 5);
            ctx.stroke();
            arrowTops.push([x, belka_y - 30]);
        }
        ctx.beginPath();
        for (let i = 0; i < arrowTops.length - 1; i++) {
            ctx.moveTo(...arrowTops[i]);
            ctx.lineTo(...arrowTops[i + 1]);
        }
        ctx.stroke();
        ctx.fillText(`${q} kN/m`, belka_x_start + belka_length_px / 2, belka_y - 50);
    }

    if (P > 0 && L > 0 && a <= L) {
        const x_pos = belka_x_start + (a / L) * belka_length_px;
        ctx.beginPath();
        ctx.moveTo(x_pos, belka_y - 70);
        ctx.lineTo(x_pos, belka_y);
        ctx.stroke();
        ctx.lineTo(x_pos - 5, belka_y - 5);
        ctx.moveTo(x_pos, belka_y);
        ctx.lineTo(x_pos + 5, belka_y - 5);
        ctx.stroke();
        ctx.fillText(`${P} kN`, x_pos, belka_y - 90);
    }

    ctx.fillText(`${document.getElementById("rozmiar").value}`, belka_x_start + belka_length_px / 2, belka_y + 30);
}

async function calculateBeam() {
    const data = {
        L: parseFloat(document.getElementById("L").value),
        q: parseFloat(document.getElementById("q").value),
        P: parseFloat(document.getElementById("P").value),
        a: parseFloat(document.getElementById("a").value),
        E: parseFloat(document.getElementById("E").value),
        kategoria: document.getElementById("kategoria").value,
        rozmiar: document.getElementById("rozmiar").value,
        os: document.querySelector("input[name='os']:checked").value,
        warunek: document.getElementById("warunek").value,
        tryb: document.querySelector("input[name='tryb']:checked").value
    };

    const response = await fetch("/ugiecie-belki/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    const result = await response.json();

    document.getElementById("rzeczywiste").innerText = `Rzeczywiste ugięcie: ${Math.round(Math.abs(result.V_max))} mm`;
    document.getElementById("dopuszczalne").innerText = `Dopuszczalne ugięcie: ${Math.round(result.v_dop)} mm (${data.warunek})`;
    document.getElementById("moment").innerText = `Maksymalny moment: ${result.M_max.toFixed(2)} kNm`;
    document.getElementById("wytezenie").innerText = `Wytężenie przekroju: ${result.wytężenie.toFixed(2)}%`;
    document.getElementById("optymalny").innerText = `Najlepszy profil: ${result.najlepszy || "-"}`;
    document.getElementById("przekroczony").innerText = `Pierwszy przekroczony: ${result.przekroczony || "-"}`;

    // Wykres ugięcia z wartością maksymalną
    Plotly.newPlot("ugieciePlot", [{
        x: result.x_vals,
        y: result.v_vals,
        type: "scatter",
        mode: "lines",
        name: "Ugięcie (mm)",
        line: { color: Math.abs(result.V_max) < result.v_dop ? "green" : "red" }
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
        yaxis: { title: "Ugięcie [mm]" },
        annotations: [{
            x: result.x_vals[v_vals.indexOf(Math.min(...result.v_vals))],
            y: Math.min(...result.v_vals),
            xref: "x",
            yref: "y",
            text: `Max: ${Math.round(Math.abs(Math.min(...result.v_vals)))} mm`,
            showarrow: true,
            arrowhead: 2,
            ax: 20,
            ay: -30
        }]
    });

    // Wykres momentu z wartością maksymalną
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
        yaxis: { title: "Moment [kNm]" },
        annotations: [{
            x: result.x_vals[result.m_vals.indexOf(Math.min(...result.m_vals))],
            y: Math.min(...result.m_vals),
            xref: "x",
            yref: "y",
            text: `Max: ${Math.abs(Math.min(...result.m_vals)).toFixed(2)} kNm`,
            showarrow: true,
            arrowhead: 2,
            ax: 20,
            ay: -30
        }]
    });

    // Linie wymiarowe pod kanwą
    const canvas = document.getElementById("beamCanvas");
    const ctx = canvas.getContext("2d");
    const dimensionY = 300;

    // Linia dla siły P
    if (P > 0 && data.L > 0 && data.a <= data.L) {
        ctx.beginPath();
        ctx.moveTo(50, dimensionY);
        ctx.lineTo(350, dimensionY);
        ctx.stroke();
        const a_pos = 50 + (data.a / data.L) * 300;
        ctx.fillText(`P=${data.P} kN`, a_pos - 20, dimensionY - 10);
        ctx.fillText(`${data.a.toFixed(1)} m`, 50, dimensionY + 20);
        ctx.fillText(`${(data.L - data.a).toFixed(1)} m`, a_pos, dimensionY + 20);
        ctx.fillText(`${data.L.toFixed(1)} m`, 350, dimensionY + 20);
    }

    // Linia dla całkowitej długości belki
    ctx.beginPath();
    ctx.moveTo(50, dimensionY + 30);
    ctx.lineTo(350, dimensionY + 30);
    ctx.stroke();
    ctx.fillText(`${data.L.toFixed(1)} m`, 200, dimensionY + 50);
}
