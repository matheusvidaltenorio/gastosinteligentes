"""Parsing seguro de datas em query strings (ISO: YYYY-MM-DD)."""
from datetime import date

from app.errors import APIError


def parse_optional_date(value: str | None, field_name: str) -> date | None:
    if value is None or value.strip() == "":
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError as exc:
        raise APIError(
            f"Parâmetro '{field_name}' deve ser uma data ISO válida (AAAA-MM-DD).",
            status_code=422,
        ) from exc


def parse_required_month_year(year_s: str, month_s: str) -> tuple[int, int]:
    try:
        year = int(year_s)
        month = int(month_s)
    except (TypeError, ValueError) as exc:
        raise APIError("Parâmetros 'year' e 'month' devem ser inteiros.", status_code=422) from exc
    if not (1 <= month <= 12):
        raise APIError("month deve estar entre 1 e 12.", status_code=422)
    if year < 1900 or year > 2100:
        raise APIError("year fora do intervalo permitido.", status_code=422)
    return year, month
