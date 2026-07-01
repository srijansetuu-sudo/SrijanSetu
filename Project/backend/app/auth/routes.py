from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import APIResponse, LoginRequest, LogoutRequest, RefreshRequest, SignupRequest, TokenData, TokenResponse
from app.auth.service import login, logout, rotate_refresh_token, signup
from app.database.session import get_db
from app.users.models import User
from app.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup_route(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, user = await signup(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
    )
    return TokenResponse(
        message="Signup successful",
        data=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login_route(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, user = await login(db=db, email=payload.email, password=payload.password)
    return TokenResponse(
        message="Login successful",
        data=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_route(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, user = await rotate_refresh_token(db=db, refresh_token=payload.refresh_token)
    return TokenResponse(
        message="Token refreshed",
        data=TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        ),
    )


@router.post("/logout", response_model=APIResponse)
async def logout_route(payload: LogoutRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    await logout(db=db, refresh_token=payload.refresh_token, user=current_user)
    return APIResponse(message="Logout successful", data={})


@router.get("/me", response_model=APIResponse)
async def me_route(current_user=Depends(get_current_active_user)):
    return APIResponse(message="User fetched", data={"user": UserResponse.model_validate(current_user).model_dump(mode="json")})
