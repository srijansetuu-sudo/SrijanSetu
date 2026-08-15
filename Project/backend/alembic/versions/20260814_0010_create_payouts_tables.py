"""create payouts and payout_audit_logs tables

Revision ID: 20260814_0010
Revises: 20260806_0009
Create Date: 2026-08-14 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260814_0010'
down_revision = '20260806_0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'payouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'REPORTED', 'COMPLETED', 'FAILED', name='payoutstatus'), nullable=False, server_default='PENDING'),
        sa.Column('transaction_id', sa.Text(), nullable=False),
        sa.Column('payment_method', sa.String(length=80), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('commission_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('creator_receivable', sa.Numeric(12, 2), nullable=False),
        sa.Column('payout_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index(op.f('ix_payouts_transaction_id'), 'payouts', ['transaction_id'], unique=False)
    op.create_unique_constraint('uq_payouts_order_id', 'payouts', ['order_id'])
    op.create_unique_constraint('uq_payouts_transaction_id', 'payouts', ['transaction_id'])
    op.create_check_constraint('ck_payouts_amount_non_negative', 'payouts', 'amount >= 0')
    op.create_check_constraint('ck_payouts_commission_non_negative', 'payouts', 'commission_amount >= 0')
    op.create_check_constraint('ck_payouts_receivable_non_negative', 'payouts', 'creator_receivable >= 0')

    op.create_table(
        'payout_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payouts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('event_type', sa.String(length=80), nullable=False),
        sa.Column('event_data', sa.Text(), nullable=True),
        sa.Column('performed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index(op.f('ix_payout_audit_payout_id'), 'payout_audit_logs', ['payout_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_payout_audit_payout_id'), table_name='payout_audit_logs')
    op.drop_table('payout_audit_logs')
    op.drop_constraint('ck_payouts_receivable_non_negative', 'payouts', type_='check')
    op.drop_constraint('ck_payouts_commission_non_negative', 'payouts', type_='check')
    op.drop_constraint('ck_payouts_amount_non_negative', 'payouts', type_='check')
    op.drop_constraint('uq_payouts_transaction_id', 'payouts', type_='unique')
    op.drop_constraint('uq_payouts_order_id', 'payouts', type_='unique')
    op.drop_index(op.f('ix_payouts_transaction_id'), table_name='payouts')
    op.drop_table('payouts')
    sa.Enum(name='payoutstatus').drop(op.get_bind(), checkfirst=False)
