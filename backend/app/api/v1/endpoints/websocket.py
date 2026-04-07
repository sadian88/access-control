import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.ws_manager import ws_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Mantener la conexión viva; el admin solo escucha, no envía mensajes
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
