import pytest
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database.session import AsyncSessionLocal
from app.users.models import UserRole, User
import app.creators.models  # ensure CreatorProfile mapper is registered for relationships
import app.requirements.models
import app.quotations.models
import app.orders.models
import app.payments.models
import app.database.base  # import central base to register all mappers
from app.orders.models import OrderStatus
from app.payments.models import PaymentStatus
from app.payouts.service import create_payout, get_payout_by_order
from app.payouts import schemas
from app.core.exceptions import APIError
from types import SimpleNamespace
from uuid import uuid4


@pytest.mark.asyncio
async def test_create_payout_success():
    async with AsyncSessionLocal() as db:  # type: AsyncSession
        # create admin, customer, creator via SQL inserts to avoid mapper init ordering issues
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Admin", "em": f"admin-{uuid4()}@example.com", "ph": "x", "r": UserRole.ADMIN.value})
        admin_id = res.scalar_one()
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Cust", "em": f"cust-{uuid4()}@example.com", "ph": "x", "r": UserRole.CUSTOMER.value})
        customer_id = res.scalar_one()
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Creator", "em": f"creator-{uuid4()}@example.com", "ph": "x", "r": UserRole.CREATOR.value})
        creator_id = res.scalar_one()

        # create requirement and quotation and order chain
        req_res = await db.execute(text("INSERT INTO requirements (customer_id, title, description, budget_min, budget_max) VALUES (:cid, :t, :d, :bmin, :bmax) RETURNING id"), {"cid": customer_id, "t": "t", "d": "d", "bmin": Decimal("10.00"), "bmax": Decimal("100.00")})
        requirement_id = req_res.scalar_one()
        quot_res = await db.execute(text("INSERT INTO quotations (requirement_id, creator_id, proposed_price, estimated_days, message, revisions_allowed) VALUES (:req, :cid, :p, :e, :m, :rev) RETURNING id"), {"req": requirement_id, "cid": creator_id, "p": Decimal("100.00"), "e": 1, "m": "m", "rev": 0})
        quotation_id = quot_res.scalar_one()
        from datetime import datetime

        order_res = await db.execute(text("INSERT INTO orders (requirement_id, quotation_id, customer_id, creator_id, total_amount, platform_commission, status, payout_ready_at) VALUES (:req, :quot, :cust, :cre, :tot, :comm, :st, :pr) RETURNING id"), {"req": requirement_id, "quot": quotation_id, "cust": customer_id, "cre": creator_id, "tot": Decimal("100.00"), "comm": Decimal("10.00"), "st": OrderStatus.COMPLETED.value, "pr": datetime.utcnow()})
        order_id = order_res.scalar_one()
        payment_res = await db.execute(text("INSERT INTO payments (order_id, amount, payment_status) VALUES (:oid, :amt, :st) RETURNING id"), {"oid": order_id, "amt": Decimal("100.00"), "st": PaymentStatus.SUCCESS.value})
        await db.commit()

        admin = SimpleNamespace(id=admin_id)
        payload = schemas.PayoutCreate(transaction_id=f"TXN-{uuid4()}", payment_method="UPI", remarks="Test")

        payout = await create_payout(db, admin, order_id, payload)
        assert payout.order_id == order_id
        assert payout.transaction_id == payload.transaction_id
        assert float(payout.amount) == 100.00

        # audit log created
        audit = await get_payout_by_order(db, order_id)
        assert audit is not None


@pytest.mark.asyncio
async def test_create_payout_duplicate_transaction_conflict():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Admin2", "em": f"admin2-{uuid4()}@example.com", "ph": "x", "r": UserRole.ADMIN.value})
        admin_id = res.scalar_one()
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Cust2", "em": f"cust2-{uuid4()}@example.com", "ph": "x", "r": UserRole.CUSTOMER.value})
        customer_id = res.scalar_one()
        res = await db.execute(text("INSERT INTO users (full_name, email, password_hash, role) VALUES (:fn, :em, :ph, :r) RETURNING id"), {"fn": "Creator2", "em": f"creator2-{uuid4()}@example.com", "ph": "x", "r": UserRole.CREATOR.value})
        creator_id = res.scalar_one()

        req_res = await db.execute(text("INSERT INTO requirements (customer_id, title, description, budget_min, budget_max) VALUES (:cid, :t, :d, :bmin, :bmax) RETURNING id"), {"cid": customer_id, "t": "t2", "d": "d2", "bmin": Decimal("10.00"), "bmax": Decimal("100.00")})
        requirement_id = req_res.scalar_one()
        quot_res = await db.execute(text("INSERT INTO quotations (requirement_id, creator_id, proposed_price, estimated_days, message, revisions_allowed) VALUES (:req, :cid, :p, :e, :m, :rev) RETURNING id"), {"req": requirement_id, "cid": creator_id, "p": Decimal("50.00"), "e": 1, "m": "m2", "rev": 0})
        quotation_id = quot_res.scalar_one()
        from datetime import datetime
        order_res = await db.execute(text("INSERT INTO orders (requirement_id, quotation_id, customer_id, creator_id, total_amount, platform_commission, status, payout_ready_at) VALUES (:req, :quot, :cust, :cre, :tot, :comm, :st, :pr) RETURNING id"), {"req": requirement_id, "quot": quotation_id, "cust": customer_id, "cre": creator_id, "tot": Decimal("50.00"), "comm": Decimal("5.00"), "st": OrderStatus.COMPLETED.value, "pr": datetime.utcnow()})
        order_id = order_res.scalar_one()
        await db.execute(text("INSERT INTO payments (order_id, amount, payment_status) VALUES (:oid, :amt, :st)"), {"oid": order_id, "amt": Decimal("50.00"), "st": PaymentStatus.SUCCESS.value})
        await db.commit()

        admin = SimpleNamespace(id=admin_id)
        txn = f"DUP-{uuid4()}"
        payload = schemas.PayoutCreate(transaction_id=txn, payment_method="UPI", remarks=None)
        # first create should succeed
        p1 = await create_payout(db, admin, order_id, payload)
        assert p1.transaction_id == payload.transaction_id

        # attempt to create another payout for same order should raise APIError 409
        with pytest.raises(APIError) as excinfo:
            await create_payout(db, admin, order_id, payload)
        assert excinfo.value.status_code == 409
