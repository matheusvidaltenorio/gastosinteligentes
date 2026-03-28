"""Análises agregadas sobre o histórico financeiro do usuário."""
from collections import defaultdict
from datetime import date
from decimal import Decimal

from app.models import Transaction
from app.models.transaction import TransactionType

# weekday() em Python: 0 = segunda, 6 = domingo
_WEEKDAY_PT = (
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
)


def build_insights(
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

    rows = list(q)

    total_receitas = Decimal("0")
    total_despesas = Decimal("0")
    by_weekday = defaultdict(lambda: Decimal("0"))
    by_category = defaultdict(lambda: Decimal("0"))
    expense_dates = set()

    for row in rows:
        v = row.valor_decimal()
        if row.tipo == TransactionType.RECEITA:
            total_receitas += v
        elif row.tipo == TransactionType.DESPESA:
            total_despesas += v
            wd = row.data.weekday()
            by_weekday[wd] += v
            by_category[row.categoria] += v
            expense_dates.add(row.data)

    dia_mais_gasta = None
    if by_weekday:
        # Empate no total: dia mais cedo na semana (0=segunda) prevalece — resultado estável.
        max_wd = max(by_weekday.keys(), key=lambda d: (by_weekday[d], -d))
        dia_mais_gasta = {
            "dia_da_semana": _WEEKDAY_PT[max_wd],
            "total_gasto": str(by_weekday[max_wd].quantize(Decimal("0.01"))),
        }

    categoria_maior = None
    if by_category:
        top_cat = max(by_category.keys(), key=lambda c: (by_category[c], c))
        categoria_maior = {
            "categoria": top_cat,
            "total_gasto": str(by_category[top_cat].quantize(Decimal("0.01"))),
        }

    distinct_days = len(expense_dates)
    if distinct_days > 0 and total_despesas > 0:
        media = (total_despesas / distinct_days).quantize(Decimal("0.01"))
    else:
        media = Decimal("0")
    media_por_dia = str(media)

    alerta = None
    if total_despesas > total_receitas:
        alerta = "Você está gastando mais do que ganha."

    return {
        "periodo": {
            "inicio": start_date.isoformat() if start_date else None,
            "fim": end_date.isoformat() if end_date else None,
        },
        "dia_da_semana_que_mais_gasta": dia_mais_gasta,
        "categoria_com_maior_gasto": categoria_maior,
        "media_gastos_por_dia_com_despesa": media_por_dia,
        "totais": {
            "total_receitas": str(total_receitas.quantize(Decimal("0.01"))),
            "total_despesas": str(total_despesas.quantize(Decimal("0.01"))),
            "saldo": str((total_receitas - total_despesas).quantize(Decimal("0.01"))),
        },
        "alerta": alerta,
    }
