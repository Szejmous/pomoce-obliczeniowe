from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import json

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Lista aktywnych połączeń WebSocket (z nazwą i kolorem użytkownika)
active_connections = []

@router.get("/", response_class=HTMLResponse)
async def chat(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@router.websocket("/ws")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        # Odbierz pierwszą wiadomość z nazwą i kolorem użytkownika
        data = await websocket.receive_text()
        client_data = json.loads(data)
        client_name = client_data.get("user", "Anonim")
        client_color = client_data.get("color", "#000000")  # Domyślny kolor: czarny

        # Dodaj połączenie z nazwą i kolorem
        connection_info = {"websocket": websocket, "name": client_name, "color": client_color}
        active_connections.append(connection_info)

        # Powiadom o dołączeniu użytkownika
        join_message = {"user": "System", "message": f"{client_name} dołączył do chatu", "color": "#000000"}
        await broadcast(json.dumps(join_message))

        while True:
            # Odbieraj kolejne wiadomości
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_data["user"] = client_name
            message_data["color"] = client_color  # Dodaj kolor do wiadomości
            await broadcast(json.dumps(message_data))
    except WebSocketDisconnect:
        active_connections[:] = [conn for conn in active_connections if conn["websocket"] != websocket]
        leave_message = {"user": "System", "message": f"{client_name} opuścił chat", "color": "#000000"}
        await broadcast(json.dumps(leave_message))
    except Exception as e:
        print(f"Błąd: {e}")
        active_connections[:] = [conn for conn in active_connections if conn["websocket"] != websocket]

async def broadcast(message: str):
    # Wyślij wiadomość do wszystkich aktywnych połączeń
    for connection in active_connections:
        await connection["websocket"].send_text(message)
