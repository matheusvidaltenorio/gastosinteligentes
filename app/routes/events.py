"""
Eventos / divisão de gastos.

Rotas autenticadas: CRUD do criador, PIX mock, confirmação de pagamento.
Rotas públicas: consulta por código e marcar participante como pago (sem login).
"""
from urllib.parse import urlparse

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.errors import APIError
from app.schemas.events import (
    AddParticipantSchema,
    EventCreateSchema,
    EventDetailResponseSchema,
    EventListItemSchema,
    EventPublicResponseSchema,
    EventUpdateSchema,
    ParticipantPatchSchema,
    ParticipantPublicPaySchema,
    ParticipantResponseSchema,
    PaymentConfirmSchema,
    SplitCalculateSchema,
)
from app.services import event_service
from app.services import whatsapp_share_service
from app.utils.jwt_identity import get_current_user_id
from app.utils.validation import load_json

events_bp = Blueprint("events", __name__, url_prefix="/events")

create_schema = EventCreateSchema()
update_event_schema = EventUpdateSchema()
split_calc_schema = SplitCalculateSchema()
add_participant_schema = AddParticipantSchema()
patch_participant_schema = ParticipantPatchSchema()
public_pay_schema = ParticipantPublicPaySchema()
payment_confirm_schema = PaymentConfirmSchema()

event_detail_out = EventDetailResponseSchema()
event_list_out = EventListItemSchema()
event_public_out = EventPublicResponseSchema()
participant_out = ParticipantResponseSchema()


def _absolute_public_app_root() -> str | None:
    """
    Origem absoluta do frontend (React), com prefixo /app do Vite.
    WhatsApp só transforma em link clicável URLs com http(s):// e host.
    """
    cfg = (current_app.config.get("FRONTEND_PUBLIC_URL") or "").strip().rstrip("/")
    if cfg.startswith("http://") or cfg.startswith("https://"):
        return cfg if cfg.endswith("/app") else f"{cfg}/app"

    origin = (request.headers.get("Origin") or "").strip().rstrip("/")
    if origin.startswith("http://") or origin.startswith("https://"):
        return f"{origin}/app"

    ref = (request.headers.get("Referer") or "").strip()
    if ref:
        u = urlparse(ref)
        if u.scheme and u.netloc:
            return f"{u.scheme}://{u.netloc}/app"

    base = (request.host_url or "").rstrip("/")
    if base.startswith("http://") or base.startswith("https://"):
        return f"{base}/app"

    return None


def _public_event_link(codigo: str) -> str:
    path = f"/evento/{codigo.strip().upper()}"
    root = _absolute_public_app_root()
    if root:
        return f"{root}{path}"
    return f"/app{path}"


def _detail_payload(ev):
    body = event_detail_out.dump(ev)
    body["resumo"] = event_service.event_summary(ev)
    body["link_publico"] = _public_event_link(ev.codigo)
    return body


def _public_payload(ev):
    body = event_public_out.dump(ev)
    body["link_publico"] = _public_event_link(ev.codigo)
    return body


@events_bp.route("", methods=["POST"])
@jwt_required()
def create():
    data = load_json(create_schema, partial=False)
    ev = event_service.create_event(
        get_current_user_id(),
        nome=data["nome"],
        descricao=data.get("descricao") or "",
        valor_total=data["valor_total"],
        tipo_divisao=data["tipo_divisao"],
        participantes_raw=data["participantes"],
    )
    return jsonify(_detail_payload(ev)), 201


@events_bp.route("", methods=["GET"])
@jwt_required()
def list_mine():
    items = event_service.list_events(get_current_user_id())
    return jsonify(event_list_out.dump(items, many=True)), 200


@events_bp.route("/<int:event_id>", methods=["GET"])
@jwt_required()
def detail(event_id: int):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    return jsonify(_detail_payload(ev)), 200


@events_bp.route("/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id: int):
    data = load_json(update_event_schema, partial=True)
    if not data:
        raise APIError("Envie ao menos um campo para atualizar.", status_code=400)
    ev = event_service.update_event(
        event_id,
        get_current_user_id(),
        nome=data.get("nome"),
        descricao=data.get("descricao"),
        status=data.get("status"),
    )
    return jsonify(_detail_payload(ev)), 200


@events_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def remove_event(event_id: int):
    event_service.delete_event(event_id, get_current_user_id())
    return jsonify(ok=True), 200


@events_bp.route("/<int:event_id>/summary", methods=["GET"])
@jwt_required()
def summary(event_id: int):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    return jsonify(event_service.event_summary(ev)), 200


@events_bp.route("/<int:event_id>/split/calculate", methods=["POST"])
@jwt_required()
def split_calculate(event_id: int):
    _ = event_id  # reservado para futura lógica com evento existente
    data = load_json(split_calc_schema, partial=False)
    preview = event_service.preview_split(
        data["valor_total"], data["tipo_divisao"], data["participantes"]
    )
    return jsonify(sugestao=preview), 200


@events_bp.route("/<int:event_id>/split/manual", methods=["POST"])
@jwt_required()
def split_manual_alias(event_id: int):
    """Mesmo contrato de /split/calculate, forçando tipo_divisao=manual."""
    _ = event_id
    if not request.is_json:
        raise APIError(
            "Content-Type deve ser application/json.",
            status_code=415,
        )
    raw = request.get_json(silent=True)
    if raw is None:
        raise APIError("Corpo JSON inválido ou vazio.", status_code=400)
    body = dict(raw)
    body["tipo_divisao"] = "manual"
    try:
        data = split_calc_schema.load(body)
    except ValidationError as exc:
        raise APIError(
            "Erro de validação nos dados enviados.",
            status_code=422,
            payload={"details": exc.messages},
        ) from exc
    preview = event_service.preview_split(
        data["valor_total"], "manual", data["participantes"]
    )
    return jsonify(sugestao=preview), 200


@events_bp.route("/<int:event_id>/participants", methods=["POST"])
@jwt_required()
def add_participant_route(event_id: int):
    data = load_json(add_participant_schema, partial=False)
    p = event_service.add_participant(
        event_id,
        get_current_user_id(),
        nome=data["nome"],
        telefone=data.get("telefone") or "",
        email=data.get("email") or "",
        valor_devido=data.get("valor_devido"),
        peso=int(data.get("peso") or 1),
    )
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    return jsonify(participant=participant_out.dump(p), evento=_detail_payload(ev)), 201


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>",
    methods=["PATCH"],
)
@jwt_required()
def patch_participant(event_id: int, participant_id: str):
    data = load_json(patch_participant_schema, partial=True)
    if not data:
        raise APIError("Envie ao menos um campo para atualizar.", status_code=400)
    p = event_service.update_participant(
        event_id,
        get_current_user_id(),
        participant_id,
        nome=data.get("nome"),
        telefone=data.get("telefone"),
        email=data.get("email"),
        valor_devido=data.get("valor_devido"),
        valor_pago=data.get("valor_pago"),
        pago=data.get("pago"),
        status_pagamento=data.get("status_pagamento"),
        peso=data.get("peso"),
    )
    return jsonify(participant_out.dump(p)), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>",
    methods=["DELETE"],
)
@jwt_required()
def delete_participant_route(event_id: int, participant_id: str):
    event_service.delete_participant(event_id, get_current_user_id(), participant_id)
    return jsonify(ok=True), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>/pix/generate",
    methods=["POST"],
)
@jwt_required()
def pix_generate(event_id: int, participant_id: str):
    p = event_service.generate_pix_mock(
        event_id, get_current_user_id(), participant_id
    )
    return jsonify(participant_out.dump(p)), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>/pix",
    methods=["GET"],
)
@jwt_required()
def pix_get(event_id: int, participant_id: str):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    p = next((x for x in ev.participants if x.id == participant_id), None)
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    return jsonify(
        pix_code=p.pix_code,
        pix_qr_code_base64=p.pix_qr_code_base64,
        valor_devido=str(p.valor_devido),
    ), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>/payment/confirm",
    methods=["POST"],
)
@jwt_required()
def payment_confirm(event_id: int, participant_id: str):
    data = load_json(payment_confirm_schema, partial=False)
    p = event_service.confirm_participant_payment(
        event_id,
        get_current_user_id(),
        participant_id,
        valor=data["valor"],
        metodo=data["metodo"],
        observacao=data.get("observacao"),
        comprovante_url=data.get("comprovante_url"),
    )
    return jsonify(participant_out.dump(p)), 200


@events_bp.route("/<int:event_id>/share/whatsapp", methods=["GET"])
@jwt_required()
def share_whatsapp_event(event_id: int):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    link = _public_event_link(ev.codigo)
    pid = request.args.get("participant_id")
    if pid:
        p = next((x for x in ev.participants if x.id == pid), None)
        if not p:
            raise APIError("Participante não encontrado.", status_code=404)
        msg = whatsapp_share_service.message_participante(
            nome_evento=ev.nome,
            nome_participante=p.nome,
            valor_devido=str(p.valor_devido),
            valor_total_evento=str(ev.valor_total),
            codigo=ev.codigo,
            link_publico=link,
            participant_id=p.id,
            pix_code=p.pix_code,
        )
    else:
        msg = whatsapp_share_service.message_evento_geral(
            nome_evento=ev.nome, codigo=ev.codigo, link_publico=link
        )
    url = whatsapp_share_service.build_whatsapp_url(msg)
    return jsonify(url=url, message=msg), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>/share/whatsapp",
    methods=["GET"],
)
@jwt_required()
def share_whatsapp_participant(event_id: int, participant_id: str):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    p = next((x for x in ev.participants if x.id == participant_id), None)
    if not p:
        raise APIError("Participante não encontrado.", status_code=404)
    link = _public_event_link(ev.codigo)
    msg = whatsapp_share_service.message_participante(
        nome_evento=ev.nome,
        nome_participante=p.nome,
        valor_devido=str(p.valor_devido),
        valor_total_evento=str(ev.valor_total),
        codigo=ev.codigo,
        link_publico=link,
        participant_id=p.id,
        pix_code=p.pix_code,
    )
    digits = "".join(c for c in (p.telefone or "") if c.isdigit())
    url = whatsapp_share_service.build_whatsapp_url(
        msg, phone_e164=digits or None
    )
    return jsonify(url=url, message=msg), 200


# --- Público (sem JWT) ---


@events_bp.route("/code/<string:codigo>", methods=["GET"])
@events_bp.route("/public/<string:codigo>", methods=["GET"])
def public_by_code(codigo: str):
    ev = event_service.get_by_codigo_public(codigo)
    if not ev:
        raise APIError("Evento não encontrado.", status_code=404)
    return jsonify(_public_payload(ev)), 200


@events_bp.route(
    "/code/<string:codigo>/participants/<participant_id>/paid",
    methods=["PATCH"],
)
def public_set_paid(codigo: str, participant_id: str):
    data = load_json(public_pay_schema, partial=False)
    p = event_service.set_participant_pago_public(
        codigo, participant_id, pago=data["pago"]
    )
    return jsonify(participant_out.dump(p)), 200


@events_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
