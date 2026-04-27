from fastapi import APIRouter

from app.api.v1.endpoints import auth, events, identify, manual_event, people, visitors, websocket

router = APIRouter()

router.include_router(auth.router, tags=["auth"])
router.include_router(identify.router, tags=["identify"])
router.include_router(websocket.router, tags=["websocket"])
router.include_router(people.router, tags=["people"])
router.include_router(events.router, tags=["events"])
router.include_router(visitors.router, tags=["visitors"])
router.include_router(manual_event.router, tags=["manual"])


@router.get("/ping")
async def ping():
    return {"message": "pong"}
