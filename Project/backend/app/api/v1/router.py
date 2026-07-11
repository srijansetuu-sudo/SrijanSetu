from fastapi import APIRouter

from app.auth.routes import router as auth_router
from app.creators.routes import router as creators_router
from app.messages.routes import router as messages_router
from app.notifications.routes import router as notifications_router
from app.orders.routes import router as orders_router
from app.payments.routes import router as payments_router
from app.quotations.routes import router as quotations_router
from app.requirements.routes import router as requirements_router
from app.reviews.routes import router as reviews_router
from app.uploads.routes import router as uploads_router
from app.users.routes import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(creators_router)
api_router.include_router(requirements_router)
api_router.include_router(quotations_router)
api_router.include_router(orders_router)
api_router.include_router(messages_router)
api_router.include_router(payments_router)
api_router.include_router(reviews_router)
api_router.include_router(uploads_router)
api_router.include_router(notifications_router)
