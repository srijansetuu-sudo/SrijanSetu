from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect, WebSocketState


class OrderMessageConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[UUID, set[WebSocket]] = defaultdict(set)

    async def connect(self, order_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[order_id].add(websocket)

    def disconnect(self, order_id: UUID, websocket: WebSocket) -> None:
        connections = self._rooms.get(order_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._rooms.pop(order_id, None)

    async def broadcast(self, order_id: UUID, payload: dict) -> None:
        stale_connections = []
        for websocket in tuple(self._rooms.get(order_id, set())):
            if websocket.client_state != WebSocketState.CONNECTED:
                stale_connections.append(websocket)
                continue
            try:
                await websocket.send_json(payload)
            except (RuntimeError, WebSocketDisconnect):
                stale_connections.append(websocket)

        for websocket in stale_connections:
            self.disconnect(order_id, websocket)


order_message_manager = OrderMessageConnectionManager()
