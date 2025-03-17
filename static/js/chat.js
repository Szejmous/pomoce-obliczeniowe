const ws = new WebSocket(`ws://${window.location.host}/chat/ws`);
ws.onmessage = (event) => {
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p>${event.data}</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;
};
function sendMessage() {
    const msg = document.getElementById("message").value;
    ws.send(msg);
    document.getElementById("message").value = "";
}
