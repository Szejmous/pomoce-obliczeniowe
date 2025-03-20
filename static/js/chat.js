let ws;
let clientName;
let clientColor;

function startChat() {
    clientName = document.getElementById("username").value.trim();
    clientColor = document.getElementById("color").value;

    if (!clientName) {
        alert("Proszę podać nazwę!");
        return;
    }

    // Ukryj formularz i pokaż chat
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("chat-container").classList.remove("hidden");

    // Inicjalizuj WebSocket
    initializeWebSocket(clientName, clientColor);
}

function initializeWebSocket(name, color) {
    ws = new WebSocket(`wss://${window.location.host}/chat/ws`); // Zmieniono na wss://

    ws.onopen = () => {
        // Wyślij nazwę i kolor po połączeniu
        ws.send(JSON.stringify({ user: name, color: color }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const chatBox = document.getElementById("chat-box");
        if (data.image) {
            // Wyświetl obraz
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${data.image}`;
            chatBox.appendChild(img);
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.user}: [Obraz]</p>`;
        } else if (data.user) {
            // Wyświetl wiadomość użytkownika w wybranym kolorze
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.user}: ${data.message}</p>`;
        } else {
            // Wyświetl komunikat systemowy (bez "System:")
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.message}</p>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    ws.onerror = (error) => {
        console.error("Błąd WebSocket:", error);
    };

    ws.onclose = () => {
        console.log("Połączenie zamknięte");
    };
}

function sendMessage() {
    if (!ws || ws.readyState !== WebSocket.OPEN) { // Zabezpieczenie przed undefined
        alert("Połączenie z chatem nie jest aktywne. Spróbuj odświeżyć stronę.");
        return;
    }
    const msg = document.getElementById("message").value.trim();
    if (msg) {
        ws.send(JSON.stringify({ message: msg }));
        document.getElementById("message").value = "";
    }
}

// Obsługa wysyłania wiadomości klawiszem Enter
document.getElementById("message").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault(); // Zapobiega dodaniu nowej linii w polu tekstowym
        sendMessage();
    }
});

// Obsługa wklejania obrazu ze schowka
document.addEventListener("paste", (event) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) { // Zabezpieczenie przed undefined
        alert("Połączenie z chatem nie jest aktywne. Spróbuj odświeżyć stronę.");
        return;
    }
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result.split(",")[1];
                ws.send(JSON.stringify({ image: base64Image }));
            };
            reader.readAsDataURL(blob);
        }
    }
});