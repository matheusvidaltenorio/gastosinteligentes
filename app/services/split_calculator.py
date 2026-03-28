"""Divisão de valores: igual, manual e proporcional (centavos sem perda)."""
from decimal import Decimal

from app.errors import APIError


def _total_cents(total: Decimal) -> int:
    t = total.quantize(Decimal("0.01"))
    return int(t * 100)


def _cents_to_decimals(cents_list: list[int]) -> list[Decimal]:
    return [(Decimal(c) / Decimal(100)).quantize(Decimal("0.01")) for c in cents_list]


def split_equal(total: Decimal, n: int) -> list[Decimal]:
    if n <= 0:
        raise APIError("É necessário ao menos um participante.", status_code=422)
    total = total.quantize(Decimal("0.01"))
    cents = _total_cents(total)
    if cents <= 0:
        raise APIError("O valor total deve ser maior que zero.", status_code=422)
    base = cents // n
    rem = cents % n
    out_cents = [base + (1 if i < rem else 0) for i in range(n)]
    return _cents_to_decimals(out_cents)


def validate_manual_sum(total: Decimal, amounts: list[Decimal]) -> None:
    if not amounts:
        raise APIError("Informe valores para cada participante.", status_code=422)
    total = total.quantize(Decimal("0.01"))
    s = sum((a.quantize(Decimal("0.01")) for a in amounts), Decimal("0")).quantize(
        Decimal("0.01")
    )
    if s != total:
        raise APIError(
            f"A soma dos valores (R$ {s}) deve ser igual ao total do evento (R$ {total}).",
            status_code=422,
        )


def split_proportional(total: Decimal, weights: list[int]) -> list[Decimal]:
    if not weights:
        raise APIError("Informe um peso por participante.", status_code=422)
    if any(w < 1 for w in weights):
        raise APIError("Cada peso deve ser um inteiro ≥ 1.", status_code=422)
    total = total.quantize(Decimal("0.01"))
    cents = _total_cents(total)
    if cents <= 0:
        raise APIError("O valor total deve ser maior que zero.", status_code=422)
    tw = sum(weights)
    out_cents: list[int] = []
    acc = 0
    for i, wi in enumerate(weights):
        if i == len(weights) - 1:
            out_cents.append(cents - acc)
        else:
            part = (cents * wi) // tw
            out_cents.append(part)
            acc += part
    return _cents_to_decimals(out_cents)
