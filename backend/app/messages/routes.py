from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import APIResponse
from app.core.exceptions import APIError
from app.core.security import decode_token
from app.database.session import AsyncSessionLocal, get_db
from app.messages import service
from app.messages.realtime import order_message_manager
from app.messages.schemas import MessageCreate, MessageRead
from app.users.models import User

router = APIRouter(prefix="/messages", tags=["messages"])


def _message_payload(message) -> dict:
    item = MessageRead.model_validate(message).model_dump(mode="json")
    sender = message.__dict__.get("sender")
    if sender:
        item["sender_name"] = sender.full_name
        item["sender_avatar_url"] = sender.avatar_url
    return item


@router.post("", response_model=APIResponse)
async def send_message(payload: MessageCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    message = await service.send_message(db, user, payload)
    item = _message_payload(message)
    await order_message_manager.broadcast(payload.order_id, {"type": "message", "message": item})
    return APIResponse(message="Message sent", data={"message": item})


@router.get("/orders/{order_id}", response_model=APIResponse)
async def order_messages(order_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    messages = await service.order_messages(db, user, order_id)
    items = [_message_payload(message) for message in messages]
    return APIResponse(data={"items": items})


async def _websocket_user(token: str | None, db: AsyncSession) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except APIError:
        return None
    if payload.get("token_type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        return None
    return user


@router.websocket("/orders/{order_id}/ws")
async def order_messages_ws(websocket: WebSocket, order_id: UUID):
    async with AsyncSessionLocal() as db:
        user = await _websocket_user(websocket.query_params.get("token"), db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        try:
            await service._authorize_order(db, user, order_id)
        except APIError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        try:
            await order_message_manager.connect(order_id, websocket)
            await websocket.send_json({"type": "connected", "order_id": str(order_id)})
            while True:
                try:
                    payload = await websocket.receive_json()
                except ValueError:
                    await websocket.send_json({"type": "error", "message": "Invalid message payload"})
                    continue
                if payload.get("type") != "message":
                    await websocket.send_json({"type": "error", "message": "Unsupported message type"})
                    continue
                text = str(payload.get("message") or "").strip()
                attachment_url = str(payload.get("attachment_url") or "").strip() or None
                attachment_type = str(payload.get("attachment_type") or "").strip() or None
                attachment_name = str(payload.get("attachment_name") or "").strip() or None
                if not text and not attachment_url:
                    await websocket.send_json({"type": "error", "message": "Message or attachment is required"})
                    continue
                if len(text) > 4000:
                    await websocket.send_json({"type": "error", "message": "Message is too long"})
                    continue
                if attachment_url and len(attachment_url) > 7000000:
                    await websocket.send_json({"type": "error", "message": "Attachment is too large"})
                    continue
                message = await service.send_message(
                    db,
                    user,
                    MessageCreate(
                        order_id=order_id,
                        message=text,
                        attachment_url=attachment_url,
                        attachment_type=attachment_type,
                        attachment_name=attachment_name,
                    ),
                )
                await order_message_manager.broadcast(order_id, {"type": "message", "message": _message_payload(message)})
        except WebSocketDisconnect:
            pass
        finally:
            order_message_manager.disconnect(order_id, websocket)
