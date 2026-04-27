import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.ws_manager import ws_manager
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/admin")
async def admin_websocket(
    websocket: WebSocket,
    token: str | None = Query(None),
):
    if token:
        payload = decode_access_token(token)
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
    else:
        await websocket.close(code=1008, reason="Missing token")
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
