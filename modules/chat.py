from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Lista aktywnych połączeń WebSocket
active_connections = []

@router.get("/", response_class=HTMLResponse)
async def chat(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Odbierz pierwszą wiadomość z identyfikacją użytkownika
        data = await websocket.receive_text()
        client_data = json.loads(data)
        client_name = client_data.get("user", "Anonim")

        # Powiadom o dołączeniu użytkownika
        join_message = {"user": "System", "message": f"{client_name} dołączył do chatu"}
        await broadcast(json.dumps(join_message))

        while True:
            # Odbieraj kolejne wiadomości
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_data["user"] = client_name  # Dodaj nazwę użytkownika do każdej wiadomości
            await broadcast(json.dumps(message_data))
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        leave_message = {"user": "System", "message": f"{client_name} opuścił chat"}
        await broadcast(json.dumps(leave_message))
    except Exception as e:
        print(f"Błąd: {e}")
        active_connections.remove(websocket)

async def broadcast(message: str):
    # Wyślij wiadomość do wszystkich aktywnych połączeń
    for connection in active_connections:
        await connection.send_text(message)
