let ws;

function initializeWebSocket(clientName) {
    ws = new WebSocket(`ws://${window.location.host}/chat/ws`);

    ws.onopen = () => {
        // Wyślij identyfikację użytkownika po połączeniu
        ws.send(JSON.stringify({ user: clientName }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const chatBox = document.getElementById("chat-box");
        if (data.image) {
            // Wyświetl obraz
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${data.image}`;
            img.style.maxWidth = "200px";
            chatBox.appendChild(img);
            chatBox.innerHTML += `<p>${data.user}: [Obraz]</p>`;
        } else {
            // Wyświetl tekst
            chatBox.innerHTML += `<p>${data.user}: ${data.message}</p>`;
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
    const msg = document.getElementById("message").value.trim();
    if (msg && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: msg }));
        document.getElementById("message").value = "";
    }
}

// Obsługa wklejania obrazu ze schowka
document.addEventListener("paste", (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (let item of items) {
        if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target.result.split(",")[1]; // Usuń prefix "data:image/png;base64,"
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ image: base64Image }));
                }
            };
            reader.readAsDataURL(blob);
        }
    }
});
