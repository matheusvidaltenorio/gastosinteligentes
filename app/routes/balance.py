"""Endpoint de saldo agregado (receitas, despesas, saldo final)."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.errors import APIError
from app.services import balance_service
from app.utils.dates import parse_optional_date
from app.utils.jwt_identity import get_current_user_id

balance_bp = Blueprint("balance", __name__)


@balance_bp.route("/balance", methods=["GET"])
@jwt_required()
def balance():
    """Query opcional: start_date, end_date (ISO) para filtrar o período."""
    start = parse_optional_date(request.args.get("start_date"), "start_date")
    end = parse_optional_date(request.args.get("end_date"), "end_date")
    if start and end and start > end:
        raise APIError("start_date não pode ser posterior a end_date.", status_code=422)
    data = balance_service.compute_balance(
        get_current_user_id(),
        start_date=start,
        end_date=end,
    )
    return jsonify(data), 200


@balance_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
