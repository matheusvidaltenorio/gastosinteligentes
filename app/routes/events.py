"""
Eventos / divisão de gastos.

Rotas autenticadas: CRUD do criador.
Rotas públicas: consulta por código e marcar participante como pago (sem login).
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.errors import APIError
from app.schemas.events import (
    EventCreateSchema,
    EventDetailResponseSchema,
    EventListItemSchema,
    EventPublicResponseSchema,
    ParticipantPatchSchema,
    ParticipantPublicPaySchema,
    ParticipantResponseSchema,
)
from app.services import event_service
from app.utils.jwt_identity import get_current_user_id
from app.utils.validation import load_json

events_bp = Blueprint("events", __name__, url_prefix="/events")

create_schema = EventCreateSchema()
patch_participant_schema = ParticipantPatchSchema()
public_pay_schema = ParticipantPublicPaySchema()

event_detail_out = EventDetailResponseSchema()
event_list_out = EventListItemSchema()
event_public_out = EventPublicResponseSchema()
participant_out = ParticipantResponseSchema()


@events_bp.route("", methods=["POST"])
@jwt_required()
def create():
    data = load_json(create_schema, partial=False)
    ev = event_service.create_event(
        get_current_user_id(),
        nome=data["nome"],
        valor_total=data["valor_total"],
        participantes_nomes=data["participantes"],
    )
    return jsonify(event_detail_out.dump(ev)), 201


@events_bp.route("", methods=["GET"])
@jwt_required()
def list_mine():
    items = event_service.list_events(get_current_user_id())
    return jsonify(event_list_out.dump(items, many=True)), 200


@events_bp.route("/<int:event_id>", methods=["GET"])
@jwt_required()
def detail(event_id: int):
    ev = event_service.get_event_detail(event_id, get_current_user_id())
    return jsonify(event_detail_out.dump(ev)), 200


@events_bp.route(
    "/<int:event_id>/participants/<participant_id>",
    methods=["PATCH"],
)
@jwt_required()
def patch_participant(event_id: int, participant_id: str):
    data = load_json(patch_participant_schema, partial=True)
    if not data:
        raise APIError("Envie valor_devido e/ou pago.", status_code=400)
    p = event_service.update_participant(
        event_id,
        get_current_user_id(),
        participant_id,
        valor_devido=data.get("valor_devido"),
        pago=data.get("pago"),
    )
    return jsonify(participant_out.dump(p)), 200


# --- Público (sem JWT) ---


@events_bp.route("/code/<string:codigo>", methods=["GET"])
def public_by_code(codigo: str):
    ev = event_service.get_by_codigo_public(codigo)
    if not ev:
        raise APIError("Evento não encontrado.", status_code=404)
    return jsonify(event_public_out.dump(ev)), 200


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
