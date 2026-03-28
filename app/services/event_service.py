"""Criação e consulta de eventos de divisão de gastos."""
import secrets
import string
from decimal import Decimal

from sqlalchemy.orm import selectinload

from app.errors import APIError
from app.extensions import db
from app.models.event_models import EventParticipant, SplitEvent


_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_codigo() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


def _unique_codigo() -> str:
    for _ in range(50):
        c = _generate_codigo()
        if not SplitEvent.query.filter_by(codigo=c).first():
            return c
    raise APIError("Não foi possível gerar código único. Tente novamente.", status_code=500)


def split_valor_total(total: Decimal, n: int) -> list[Decimal]:
    """Divide total em n partes; centavos extras vão às primeiras fatias."""
    if n <= 0:
        raise APIError("É necessário ao menos um participante.", status_code=422)
    total = total.quantize(Decimal("0.01"))
    cents = int(total * 100)
    if cents <= 0:
        raise APIError("O valor total deve ser maior que zero.", status_code=422)
    base = cents // n
    rem = cents % n
    out: list[Decimal] = []
    for i in range(n):
        c = base + (1 if i < rem else 0)
        out.append((Decimal(c) / Decimal(100)).quantize(Decimal("0.01")))
    return out


def create_event(
    user_id: int,
    *,
    nome: str,
    valor_total: Decimal,
    participantes_nomes: list[str],
) -> SplitEvent:
    names = [p.strip() for p in participantes_nomes if p and str(p).strip()]
    if not names:
        raise APIError("Informe ao menos um participante com nome.", status_code=422)
    if len(names) > 100:
        raise APIError("Máximo de 100 participantes por evento.", status_code=422)

    amounts = split_valor_total(valor_total, len(names))
    ev = SplitEvent(
        nome=nome.strip(),
        valor_total=valor_total.quantize(Decimal("0.01")),
        codigo=_unique_codigo(),
        user_id=user_id,
    )
    db.session.add(ev)
    db.session.flush()
    for nm, amt in zip(names, amounts):
        db.session.add(
            EventParticipant(
                nome=nm,
                event_id=ev.id,
                valor_devido=amt,
                pago=False,
            )
        )
    db.session.commit()
    db.session.refresh(ev)
    return ev


def list_events(user_id: int) -> list[SplitEvent]:
    return (
        SplitEvent.query.options(selectinload(SplitEvent.participants))
        .filter_by(user_id=user_id)
        .order_by(SplitEvent.created_at.desc())
        .all()
    )


def _get_owned(event_id: int, user_id: int) -> SplitEvent:
    ev = SplitEvent.query.filter_by(id=event_id, user_id=user_id).first()
    if not ev:
        raise APIError("Evento não encontrado.", status_code=404)
    return ev


def get_event_detail(event_id: int, user_id: int) -> SplitEvent:
    return _get_owned(event_id, user_id)


def update_participant(
    event_id: int,
    user_id: int,
    participant_id: str,
    *,
    valor_devido: Decimal | None = None,
    pago: bool | None = None,
) -> EventParticipant:
    ev = _get_owned(event_id, user_id)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    if valor_devido is not None:
        v = valor_devido.quantize(Decimal("0.01"))
        if v <= 0:
            raise APIError("valor_devido deve ser maior que zero.", status_code=422)
        p.valor_devido = v
    if pago is not None:
        p.pago = pago
    db.session.commit()
    db.session.refresh(p)
    return p


def get_by_codigo_public(codigo: str) -> SplitEvent | None:
    c = (codigo or "").strip().upper()
    if not c:
        return None
    return SplitEvent.query.filter_by(codigo=c).first()


def set_participant_pago_public(codigo: str, participant_id: str, pago: bool) -> EventParticipant:
    ev = get_by_codigo_public(codigo)
    if not ev:
        raise APIError("Evento não encontrado.", status_code=404)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    p.pago = pago
    db.session.commit()
    db.session.refresh(p)
    return p
