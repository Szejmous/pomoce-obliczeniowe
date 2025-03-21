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

    console.log("Rozpoczynanie chatu dla:", clientName, "z kolorem:", clientColor);

    // Ukryj formularz i pokaż chat
    document.getElementById("setup").classList.add("hidden");
    document.getElementById("chat-container").classList.remove("hidden");

    // Inicjalizuj WebSocket
    initializeWebSocket(clientName, clientColor);
}

function initializeWebSocket(name, color) {
    const wsUrl = `wss://${window.location.host}/chat/ws`;
    console.log("Inicjalizacja WebSocket z URL:", wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket otwarty");
        const initMessage = JSON.stringify({ user: name, color: color });
        console.log("Wysyłanie danych inicjalnych:", initMessage);
        ws.send(initMessage);
    };

    ws.onmessage = (event) => {
        console.log("Otrzymano wiadomość:", event.data);
        const data = JSON.parse(event.data);
        const chatBox = document.getElementById("chat-box");
        if (data.image) {
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${data.image}`;
            chatBox.appendChild(img);
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.user}: [Obraz]</p>`;
        } else if (data.user) {
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.user}: ${data.message}</p>`;
        } else {
            chatBox.innerHTML += `<p style="color: ${data.color}">${data.message}</p>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    ws.onerror = (error) => {
        console.error("Błąd WebSocket:", error);
    };

    ws.onclose = (event) => {
        console.log("Połączenie WebSocket zamknięte. Kod:", event.code, "Powód:", event.reason);
    };
}

function sendMessage() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert("Połączenie z chatem nie jest aktywne. Spróbuj odświeżyć stronę.");
        console.warn("Próba wysłania wiadomości bez aktywnego połączenia WebSocket");
        return;
    }
    const msg = document.getElementById("message").value.trim();
    if (msg) {
        const messageData = JSON.stringify({ message: msg });
        console.log("Wysyłanie wiadomości:", messageData);
        ws.send(messageData);
        document.getElementById("message").value = "";
    }
}

// Obsługa wysyłania wiadomości klawiszem Enter
document.getElementById("message").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// Obsługa wklejania obrazu ze schowka
document.addEventListener("paste", (event) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert("Połączenie z chatem nie jest aktywne. Spróbuj odświeżyć stronę.");
        console.warn("Próba wklejenia obrazu bez aktywnego połączenia WebSocket");
        return;
    }
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result.split(",")[1];
                const imageData = JSON.stringify({ image: base64Image });
                console.log("Wysyłanie obrazu:", imageData.substring(0, 50) + "..."); // Skrócone logowanie
                ws.send(imageData);
            };
            reader.readAsDataURL(blob);
        }
    }
});
