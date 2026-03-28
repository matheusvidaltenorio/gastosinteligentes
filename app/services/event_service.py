"""Eventos: CRUD, divisão (igual / manual / proporcional), PIX mock, resumo."""
import secrets
import string
from decimal import Decimal

from sqlalchemy.orm import selectinload

from app.errors import APIError
from app.extensions import db
from app.models.event_models import EventPaymentLog, EventParticipant, SplitEvent
from app.services import pix_mock_service, split_calculator

_CODE_ALPHABET = string.ascii_uppercase + string.digits

TIPO_DIVISAO = frozenset({"igual", "manual", "proporcional"})
EVENT_STATUS = frozenset({"aberto", "encerrado", "concluido"})
PAY_STATUS = frozenset({"pendente", "pago", "parcial"})


def _generate_codigo() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


def _unique_codigo() -> str:
    for _ in range(50):
        c = _generate_codigo()
        if not SplitEvent.query.filter_by(codigo=c).first():
            return c
    raise APIError("Não foi possível gerar código único. Tente novamente.", status_code=500)


def _sync_payment_columns(p: EventParticipant) -> None:
    vd = Decimal(str(p.valor_devido))
    vp = Decimal(str(p.valor_pago or 0)).quantize(Decimal("0.01"))
    if vp >= vd and vd > 0:
        p.status_pagamento = "pago"
        p.valor_pago = vd
        p.pago = True
    elif vp > 0:
        p.status_pagamento = "parcial"
        p.pago = False
    else:
        if p.status_pagamento == "pago":
            p.pago = True
            p.valor_pago = vd
        else:
            p.status_pagamento = "pendente"
            p.pago = False


def _normalize_participant_rows(raw: list) -> list[dict]:
    out = []
    for item in raw:
        if isinstance(item, str):
            n = item.strip()
            if n:
                out.append(
                    {
                        "nome": n,
                        "telefone": "",
                        "email": "",
                        "peso": 1,
                        "valor_devido": None,
                    }
                )
        elif isinstance(item, dict):
            nome = (item.get("nome") or "").strip()
            if not nome:
                continue
            out.append(
                {
                    "nome": nome,
                    "telefone": (item.get("telefone") or "").strip(),
                    "email": (item.get("email") or "").strip(),
                    "peso": int(item.get("peso") or 1),
                    "valor_devido": item.get("valor_devido"),
                }
            )
    return out


def create_event(
    user_id: int,
    *,
    nome: str,
    descricao: str,
    valor_total: Decimal,
    tipo_divisao: str,
    participantes_raw: list,
) -> SplitEvent:
    if tipo_divisao not in TIPO_DIVISAO:
        raise APIError(
            f"tipo_divisao deve ser um de: {', '.join(sorted(TIPO_DIVISAO))}.",
            status_code=422,
        )
    rows = _normalize_participant_rows(participantes_raw)
    if not rows:
        raise APIError("Informe ao menos um participante com nome.", status_code=422)
    if len(rows) > 100:
        raise APIError("Máximo de 100 participantes por evento.", status_code=422)

    vt = valor_total.quantize(Decimal("0.01"))
    amounts: list[Decimal] = []

    if tipo_divisao == "igual":
        amounts = split_calculator.split_equal(vt, len(rows))
    elif tipo_divisao == "manual":
        decs = []
        for r in rows:
            v = r.get("valor_devido")
            if v is None:
                raise APIError("Na divisão manual, informe valor_devido para cada participante.", status_code=422)
            decs.append(Decimal(str(v)).quantize(Decimal("0.01")))
        split_calculator.validate_manual_sum(vt, decs)
        amounts = decs
    else:
        weights = [max(1, int(r["peso"])) for r in rows]
        amounts = split_calculator.split_proportional(vt, weights)

    ev = SplitEvent(
        nome=nome.strip(),
        descricao=(descricao or "").strip(),
        valor_total=vt,
        codigo=_unique_codigo(),
        tipo_divisao=tipo_divisao,
        status="aberto",
        user_id=user_id,
    )
    db.session.add(ev)
    db.session.flush()
    for r, amt in zip(rows, amounts, strict=True):
        p = EventParticipant(
            nome=r["nome"],
            telefone=r["telefone"],
            email=r["email"],
            event_id=ev.id,
            valor_devido=amt,
            valor_pago=Decimal("0"),
            status_pagamento="pendente",
            peso=max(1, int(r.get("peso") or 1)),
            pago=False,
        )
        _sync_payment_columns(p)
        db.session.add(p)
    db.session.commit()
    db.session.refresh(ev)
    return ev


def preview_split(
    valor_total: Decimal,
    tipo_divisao: str,
    participantes_raw: list,
) -> list[dict]:
    rows = _normalize_participant_rows(participantes_raw)
    if not rows:
        raise APIError("Informe ao menos um participante.", status_code=422)
    if tipo_divisao not in TIPO_DIVISAO:
        raise APIError("tipo_divisao inválido.", status_code=422)
    vt = valor_total.quantize(Decimal("0.01"))
    if tipo_divisao == "igual":
        amounts = split_calculator.split_equal(vt, len(rows))
    elif tipo_divisao == "manual":
        decs = []
        for r in rows:
            v = r.get("valor_devido")
            if v is None:
                raise APIError("Informe valor_devido para cada participante.", status_code=422)
            decs.append(Decimal(str(v)).quantize(Decimal("0.01")))
        split_calculator.validate_manual_sum(vt, decs)
        amounts = decs
    else:
        weights = [max(1, int(r["peso"])) for r in rows]
        amounts = split_calculator.split_proportional(vt, weights)
    return [
        {"nome": r["nome"], "valor_devido": str(a), "peso": r.get("peso", 1)}
        for r, a in zip(rows, amounts, strict=True)
    ]


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


def update_event(
    event_id: int,
    user_id: int,
    *,
    nome: str | None = None,
    descricao: str | None = None,
    status: str | None = None,
) -> SplitEvent:
    ev = _get_owned(event_id, user_id)
    if nome is not None:
        ev.nome = nome.strip()
    if descricao is not None:
        ev.descricao = descricao.strip()
    if status is not None:
        if status not in EVENT_STATUS:
            raise APIError("status inválido.", status_code=422)
        ev.status = status
    db.session.commit()
    db.session.refresh(ev)
    return ev


def delete_event(event_id: int, user_id: int) -> None:
    ev = _get_owned(event_id, user_id)
    db.session.delete(ev)
    db.session.commit()


def _peso_int(p: EventParticipant | dict) -> int:
    if isinstance(p, dict):
        w = p.get("peso", 1)
    else:
        w = p.peso if p.peso is not None else 1
    try:
        i = int(Decimal(str(w)))
    except Exception:
        i = 1
    return max(1, i)


def add_participant(
    event_id: int,
    user_id: int,
    *,
    nome: str,
    telefone: str = "",
    email: str = "",
    valor_devido: Decimal | None = None,
    peso: int = 1,
) -> EventParticipant:
    ev = _get_owned(event_id, user_id)
    if ev.status != "aberto":
        raise APIError("Só é possível adicionar participantes em eventos abertos.", status_code=422)
    nm = nome.strip()
    if not nm:
        raise APIError("Nome obrigatório.", status_code=422)
    vt = Decimal(str(ev.valor_total))
    if ev.tipo_divisao == "igual":
        parts = list(ev.participants)
        n = len(parts) + 1
        amounts = split_calculator.split_equal(vt, n)
        for p, a in zip(parts, amounts[:-1], strict=True):
            p.valor_devido = a
            _sync_payment_columns(p)
        new_amt = amounts[-1]
    elif ev.tipo_divisao == "manual":
        if valor_devido is None:
            raise APIError("Informe valor_devido na divisão manual.", status_code=422)
        new_amt = valor_devido.quantize(Decimal("0.01"))
        existentes = [Decimal(str(x.valor_devido)) for x in ev.participants]
        split_calculator.validate_manual_sum(vt, existentes + [new_amt])
    else:
        parts = list(ev.participants)
        weights = [_peso_int(p) for p in parts] + [max(1, peso)]
        amounts = split_calculator.split_proportional(vt, weights)
        for p, a in zip(parts, amounts[:-1], strict=True):
            p.valor_devido = a
            p.peso = _peso_int(p)
            _sync_payment_columns(p)
        new_amt = amounts[-1]

    p = EventParticipant(
        nome=nm,
        telefone=telefone.strip(),
        email=email.strip(),
        event_id=ev.id,
        valor_devido=new_amt,
        valor_pago=Decimal("0"),
        status_pagamento="pendente",
        peso=max(1, int(peso)),
        pago=False,
    )
    _sync_payment_columns(p)
    db.session.add(p)
    db.session.commit()
    db.session.refresh(p)
    return p


def update_participant(
    event_id: int,
    user_id: int,
    participant_id: str,
    *,
    nome: str | None = None,
    telefone: str | None = None,
    email: str | None = None,
    valor_devido: Decimal | None = None,
    valor_pago: Decimal | None = None,
    pago: bool | None = None,
    status_pagamento: str | None = None,
    peso: int | None = None,
) -> EventParticipant:
    ev = _get_owned(event_id, user_id)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    if nome is not None:
        p.nome = nome.strip()
    if telefone is not None:
        p.telefone = telefone.strip()
    if email is not None:
        p.email = email.strip()
    if valor_devido is not None:
        v = valor_devido.quantize(Decimal("0.01"))
        if v <= 0:
            raise APIError("valor_devido deve ser maior que zero.", status_code=422)
        p.valor_devido = v
        if ev.tipo_divisao == "manual":
            db.session.flush()
            parts = EventParticipant.query.filter_by(event_id=ev.id).all()
            decs = [Decimal(str(x.valor_devido)) for x in parts]
            split_calculator.validate_manual_sum(Decimal(str(ev.valor_total)), decs)
    if valor_pago is not None:
        p.valor_pago = valor_pago.quantize(Decimal("0.01"))
    if status_pagamento is not None:
        if status_pagamento not in PAY_STATUS:
            raise APIError("status_pagamento inválido.", status_code=422)
        p.status_pagamento = status_pagamento
    if peso is not None:
        p.peso = max(1, int(peso))
    if pago is not None:
        p.pago = pago
        if pago:
            p.status_pagamento = "pago"
            p.valor_pago = Decimal(str(p.valor_devido))
        elif p.valor_pago and Decimal(str(p.valor_pago)) > 0:
            pass
        else:
            p.status_pagamento = "pendente"
            p.valor_pago = Decimal("0")
    _sync_payment_columns(p)
    db.session.commit()
    db.session.refresh(p)
    return p


def delete_participant(event_id: int, user_id: int, participant_id: str) -> None:
    ev = _get_owned(event_id, user_id)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    if ev.tipo_divisao == "manual":
        raise APIError(
            "Em divisão manual não é possível remover participantes sem alterar o total. "
            "Zere valores ou exclua o evento.",
            status_code=422,
        )
    db.session.delete(p)
    db.session.flush()
    remaining = EventParticipant.query.filter_by(event_id=ev.id).all()
    vt = Decimal(str(ev.valor_total))
    if remaining:
        if ev.tipo_divisao == "igual":
            amounts = split_calculator.split_equal(vt, len(remaining))
            for pr, a in zip(remaining, amounts, strict=True):
                pr.valor_devido = a
                _sync_payment_columns(pr)
        elif ev.tipo_divisao == "proporcional":
            weights = [_peso_int(pr) for pr in remaining]
            amounts = split_calculator.split_proportional(vt, weights)
            for pr, a in zip(remaining, amounts, strict=True):
                pr.valor_devido = a
                _sync_payment_columns(pr)
    db.session.commit()


def event_summary(ev: SplitEvent) -> dict:
    parts = ev.participants or []
    total = Decimal(str(ev.valor_total))
    arrec = sum((Decimal(str(x.valor_pago or 0)) for x in parts), Decimal("0")).quantize(
        Decimal("0.01")
    )
    pendente = (total - arrec).quantize(Decimal("0.01"))
    n = len(parts)
    pagos = sum(1 for x in parts if x.status_pagamento == "pago")
    parciais = sum(1 for x in parts if x.status_pagamento == "parcial")
    pendentes = sum(1 for x in parts if x.status_pagamento == "pendente")
    pct = float((arrec / total * 100) if total > 0 else Decimal("0"))
    return {
        "valor_total": str(total),
        "total_arrecadado": str(arrec),
        "total_pendente": str(pendente),
        "participantes_count": n,
        "pagos_count": pagos,
        "parciais_count": parciais,
        "pendentes_count": pendentes,
        "percentual_arrecadado": round(min(100.0, max(0.0, pct)), 2),
    }


def generate_pix_mock(event_id: int, user_id: int, participant_id: str) -> EventParticipant:
    ev = _get_owned(event_id, user_id)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    code, b64, token = pix_mock_service.generate_mock_pix_for_participant(
        participant_nome=p.nome,
        valor=Decimal(str(p.valor_devido)),
        event_codigo=ev.codigo,
    )
    p.pix_code = code
    p.pix_qr_code_base64 = b64
    p.payment_token = token
    db.session.commit()
    db.session.refresh(p)
    return p


def confirm_participant_payment(
    event_id: int,
    user_id: int,
    participant_id: str,
    *,
    valor: Decimal,
    metodo: str,
    observacao: str | None = None,
    comprovante_url: str | None = None,
) -> EventParticipant:
    if metodo not in ("pix", "manual"):
        raise APIError("metodo deve ser pix ou manual.", status_code=422)
    ev = _get_owned(event_id, user_id)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    v = valor.quantize(Decimal("0.01"))
    if v <= 0:
        raise APIError("valor deve ser positivo.", status_code=422)
    vd = Decimal(str(p.valor_devido))
    new_paid = (Decimal(str(p.valor_pago or 0)) + v).quantize(Decimal("0.01"))
    if new_paid > vd:
        raise APIError("Valor excede o devido para este participante.", status_code=422)
    p.valor_pago = new_paid
    _sync_payment_columns(p)
    log = EventPaymentLog(
        participant_id=p.id,
        event_id=ev.id,
        valor=v,
        metodo=metodo,
        status="confirmado",
        comprovante_url=comprovante_url,
        observacao=observacao,
    )
    db.session.add(log)
    db.session.commit()
    db.session.refresh(p)
    return p


def get_by_codigo_public(codigo: str) -> SplitEvent | None:
    c = (codigo or "").strip().upper()
    if not c:
        return None
    return (
        SplitEvent.query.options(selectinload(SplitEvent.participants))
        .filter_by(codigo=c)
        .first()
    )


def set_participant_pago_public(codigo: str, participant_id: str, pago: bool) -> EventParticipant:
    ev = get_by_codigo_public(codigo)
    if not ev:
        raise APIError("Evento não encontrado.", status_code=404)
    if ev.status != "aberto":
        raise APIError("Este evento não aceita alterações públicas.", status_code=403)
    p = EventParticipant.query.filter_by(id=participant_id, event_id=ev.id).first()
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    p.pago = pago
    if pago:
        p.status_pagamento = "pago"
        p.valor_pago = Decimal(str(p.valor_devido))
    else:
        p.valor_pago = Decimal("0")
        p.status_pagamento = "pendente"
    _sync_payment_columns(p)
    db.session.commit()
    db.session.refresh(p)
    return p
