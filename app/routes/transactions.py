"""
CRUD REST de transações. Todas as operações são filtradas pelo usuário do JWT.
Filtros em GET: start_date, end_date, categoria, tipo (query string ISO e enums).
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.errors import APIError
from app.models.transaction import TransactionType
from app.schemas import (
    TransactionCreateSchema,
    TransactionResponseSchema,
    TransactionUpdateSchema,
)
from app.services import transaction_service
from app.utils.dates import parse_optional_date
from app.utils.jwt_identity import get_current_user_id
from app.utils.validation import load_json

transactions_bp = Blueprint("transactions", __name__, url_prefix="/transactions")

tx_out = TransactionResponseSchema()
create_schema = TransactionCreateSchema()
update_schema = TransactionUpdateSchema()


@transactions_bp.route("", methods=["POST"])
@jwt_required()
def create():
    data = load_json(create_schema, partial=False)
    tx = transaction_service.create_transaction(
        user_id=get_current_user_id(),
        tipo=data["tipo"],
        valor=data["valor"],
        categoria=data["categoria"],
        descricao=data.get("descricao", ""),
        data=data["data"],
    )
    return jsonify(tx_out.dump(tx)), 201


@transactions_bp.route("", methods=["GET"])
@jwt_required()
def list_all():
    start = parse_optional_date(request.args.get("start_date"), "start_date")
    end = parse_optional_date(request.args.get("end_date"), "end_date")
    categoria = request.args.get("categoria")
    tipo = request.args.get("tipo")
    if tipo and tipo not in TransactionType.ALL:
        raise APIError(
            f"tipo deve ser um de: {', '.join(TransactionType.ALL)}.",
            status_code=422,
        )
    if start and end and start > end:
        raise APIError("start_date não pode ser posterior a end_date.", status_code=422)
    items = transaction_service.list_transactions(
        get_current_user_id(),
        start_date=start,
        end_date=end,
        categoria=categoria,
        tipo=tipo,
    )
    return jsonify(tx_out.dump(items, many=True)), 200


@transactions_bp.route("/<int:transaction_id>", methods=["GET"])
@jwt_required()
def get_one(transaction_id: int):
    tx = transaction_service.get_transaction(transaction_id, get_current_user_id())
    return jsonify(tx_out.dump(tx)), 200


@transactions_bp.route("/<int:transaction_id>", methods=["PUT"])
@jwt_required()
def update(transaction_id: int):
    data = load_json(update_schema, partial=True)
    if not data:
        raise APIError("Envie ao menos um campo para atualizar.", status_code=400)
    tx = transaction_service.update_transaction(
        transaction_id,
        get_current_user_id(),
        tipo=data.get("tipo"),
        valor=data.get("valor"),
        categoria=data.get("categoria"),
        descricao=data.get("descricao"),
        data=data.get("data"),
    )
    return jsonify(tx_out.dump(tx)), 200


@transactions_bp.route("/<int:transaction_id>", methods=["DELETE"])
@jwt_required()
def delete(transaction_id: int):
    transaction_service.delete_transaction(transaction_id, get_current_user_id())
    return "", 204


@transactions_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
