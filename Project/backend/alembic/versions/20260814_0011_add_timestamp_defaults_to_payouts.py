"""add server defaults and update triggers for payout timestamps

Revision ID: 20260814_0011
Revises: 20260814_0010
Create Date: 2026-08-14 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260814_0011'
down_revision = '20260814_0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # backfill any NULL timestamps, then set server defaults to now()
    op.execute("UPDATE payouts SET created_at = now() WHERE created_at IS NULL;")
    op.execute("UPDATE payouts SET updated_at = now() WHERE updated_at IS NULL;")
    op.alter_column('payouts', 'created_at', server_default=sa.text('now()'))
    op.alter_column('payouts', 'updated_at', server_default=sa.text('now()'))

    op.execute("UPDATE payout_audit_logs SET created_at = now() WHERE created_at IS NULL;")
    op.execute("UPDATE payout_audit_logs SET updated_at = now() WHERE updated_at IS NULL;")
    op.alter_column('payout_audit_logs', 'created_at', server_default=sa.text('now()'))
    op.alter_column('payout_audit_logs', 'updated_at', server_default=sa.text('now()'))

    # create a helper function to keep updated_at current on row updates
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        """
    )

    op.execute(
        "CREATE TRIGGER trg_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
    )
    op.execute(
        "CREATE TRIGGER trg_payout_audit_logs_updated_at BEFORE UPDATE ON payout_audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_payouts_updated_at ON payouts;")
    op.execute("DROP TRIGGER IF EXISTS trg_payout_audit_logs_updated_at ON payout_audit_logs;")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    op.alter_column('payout_audit_logs', 'updated_at', server_default=None)
    op.alter_column('payout_audit_logs', 'created_at', server_default=None)
    op.alter_column('payouts', 'updated_at', server_default=None)
    op.alter_column('payouts', 'created_at', server_default=None)
