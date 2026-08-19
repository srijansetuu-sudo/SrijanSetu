from app.core.config import settings


def calculate_commission(total_amount: int) -> tuple[int, int]:
    commission = round(total_amount * settings.commission_percent / 100)
    creator_amount = total_amount - commission
    return commission, creator_amount

