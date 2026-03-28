"""Relatórios extras: gráficos, ranking e resumo mensal."""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from app.models import Transaction
from app.models.transaction import TransactionType


def spending_by_category(
    user_id: int,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """Lista adequada para gráficos (categoria + total)."""
    q = Transaction.query.filter_by(user_id=user_id, tipo=TransactionType.DESPESA)
    if start_date is not None:
        q = q.filter(Transaction.data >= start_date)
    if end_date is not None:
        q = q.filter(Transaction.data <= end_date)

    totals: dict[str, Decimal] = {}
    for row in q:
        c = row.categoria
        totals[c] = totals.get(c, Decimal("0")) + row.valor_decimal()

    out = [
        {
            "categoria": cat,
            "total": str(val.quantize(Decimal("0.01"))),
        }
        for cat, val in sorted(totals.items(), key=lambda x: x[1], reverse=True)
    ]
    return out


def category_ranking(
    user_id: int,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict]:
    """Ranking posicional das categorias por total de despesa."""
    data = spending_by_category(
        user_id, start_date=start_date, end_date=end_date
    )
    return [
        {"posicao": i + 1, "categoria": item["categoria"], "total": item["total"]}
        for i, item in enumerate(data)
    ]


def monthly_summary(user_id: int, year: int, month: int) -> dict:
    """Totais e saldo para um mês civil específico (mês já validado na rota)."""
    _, last = monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last)

    q = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.data >= start,
        Transaction.data <= end,
    )
    receitas = Decimal("0")
    despesas = Decimal("0")
    for row in q:
        v = row.valor_decimal()
        if row.tipo == TransactionType.RECEITA:
            receitas += v
        elif row.tipo == TransactionType.DESPESA:
            despesas += v
        # Tipos desconhecidos (dados legados) são ignorados, como em balance_service.

    return {
        "ano": year,
        "mes": month,
        "inicio": start.isoformat(),
        "fim": end.isoformat(),
        "total_receitas": str(receitas.quantize(Decimal("0.01"))),
        "total_despesas": str(despesas.quantize(Decimal("0.01"))),
        "saldo": str((receitas - despesas).quantize(Decimal("0.01"))),
    }
