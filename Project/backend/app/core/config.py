from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SrijanSetu API"
    environment: str = "local"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/srijansetu"
    jwt_secret_key: str = "change-me"
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    commission_percent: int = 15
    frontend_origin: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

if settings.jwt_secret and settings.jwt_secret_key == "change-me":
    settings.jwt_secret_key = settings.jwt_secret
