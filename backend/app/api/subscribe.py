import re
import logging
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["subscribe"])

class SubscribeRequest(BaseModel):
    email: str

class SubscribeResponse(BaseModel):
    message: str
    status: str

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe_newsletter(request: SubscribeRequest):
    logger.info(f"POST /api/subscribe - Received subscription request for email: {request.email}")

    email = request.email.strip()
    if not email or not re.match(EMAIL_REGEX, email):
        logger.warning("Invalid email provided to subscription endpoint")
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    logger.info(f"Successfully subscribed email: {email}")
    return SubscribeResponse(
        message="Thank you for subscribing to NarrateMe updates!",
        status="success"
    )
