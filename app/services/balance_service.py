"""Cálculo de saldo: totais de receitas, despesas e saldo líquido."""
from datetime import date
from decimal import Decimal

from app.models import Transaction
from app.models.transaction import TransactionType


def compute_balance(
    user_id: int,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    q = Transaction.query.filter_by(user_id=user_id)
    if start_date is not None:
        q = q.filter(Transaction.data >= start_date)
    if end_date is not None:
        q = q.filter(Transaction.data <= end_date)

    total_receitas = Decimal("0")
    total_despesas = Decimal("0")

    for row in q:
        v = row.valor_decimal()
        if row.tipo == TransactionType.RECEITA:
            total_receitas += v
        elif row.tipo == TransactionType.DESPESA:
            total_despesas += v

    saldo = total_receitas - total_despesas
    return {
        "total_receitas": str(total_receitas.quantize(Decimal("0.01"))),
        "total_despesas": str(total_despesas.quantize(Decimal("0.01"))),
        "saldo_final": str(saldo.quantize(Decimal("0.01"))),
    }
