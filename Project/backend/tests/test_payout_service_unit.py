import pytest
from types import SimpleNamespace
from decimal import Decimal
from uuid import uuid4

from unittest.mock import AsyncMock, MagicMock

import app.payouts.service as service
from app.payouts import schemas
from app.core.exceptions import NotFoundError, APIError
from app.orders.models import OrderStatus


@pytest.mark.asyncio
async def test_money_quantization():
    assert service._money(Decimal("1")) == Decimal("1.00")
    assert service._money(Decimal("1.235")) == Decimal("1.24")


@pytest.mark.asyncio
async def test_create_payout_order_not_found():
    db = SimpleNamespace()
    db.get = AsyncMock(return_value=None)
    admin = SimpleNamespace(id=uuid4())
    with pytest.raises(NotFoundError):
        await service.create_payout(db, admin, uuid4(), schemas.PayoutCreate(transaction_id="T", payment_method="UPI", remarks=None))


@pytest.mark.asyncio
async def test_create_payout_no_payment():
    db = SimpleNamespace()
    order = SimpleNamespace(id=uuid4(), total_amount=Decimal("100.00"), platform_commission=Decimal("10.00"), payout_ready_at=None, status=OrderStatus.COMPLETED)
    db.get = AsyncMock(return_value=order)
    db.scalar = AsyncMock(return_value=None)
    admin = SimpleNamespace(id=uuid4())
    with pytest.raises(APIError):
        await service.create_payout(db, admin, order.id, schemas.PayoutCreate(transaction_id="T", payment_method="UPI", remarks=None))


@pytest.mark.asyncio
async def test_create_payout_success_with_mocks(monkeypatch):
    # prepare fake DB
    db = SimpleNamespace()
    order = SimpleNamespace(id=uuid4(), total_amount=Decimal("50.00"), platform_commission=Decimal("5.00"), payout_ready_at=None, status=OrderStatus.COMPLETED)
    db.get = AsyncMock(return_value=order)
    db.scalar = AsyncMock(return_value=SimpleNamespace(id=uuid4()))
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    admin = SimpleNamespace(id=uuid4())

    # monkeypatch Payout and PayoutAuditLog so they behave like simple objects with ids
    class DummyPayout:
        def __init__(self, **kwargs):
            from uuid import uuid4 as _u
            self.id = _u()
            for k, v in kwargs.items():
                setattr(self, k, v)

    class DummyAudit:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    monkeypatch.setattr(service, "Payout", DummyPayout)
    monkeypatch.setattr(service, "PayoutAuditLog", DummyAudit)

    payload = schemas.PayoutCreate(transaction_id="TXN-UNIT", payment_method="UPI", remarks="ok")
    result = await service.create_payout(db, admin, order.id, payload)

    assert result is not None
    assert hasattr(result, "transaction_id") and result.transaction_id == "TXN-UNIT"
    # ensure DB methods were used
    db.add.assert_called()
    db.flush.assert_awaited()
    db.commit.assert_awaited()
