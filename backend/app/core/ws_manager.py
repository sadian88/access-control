import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestiona las conexiones WebSocket activas del dashboard admin.
    Singleton global — todas las conexiones admin reciben el mismo broadcast.
    """

    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)
        logger.info("Admin conectado. Total: %d", len(self._connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.remove(websocket)
        logger.info("Admin desconectado. Total: %d", len(self._connections))

    async def broadcast(self, payload: dict[str, Any]) -> None:
        """Envía un mensaje JSON a todos los admins conectados."""
        if not self._connections:
            return
        message = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.remove(ws)


# Singleton global
ws_manager = ConnectionManager()
