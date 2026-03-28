"""Insights inteligentes: padrões de gasto e alertas."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.errors import APIError
from app.services import insights_service
from app.utils.dates import parse_optional_date
from app.utils.jwt_identity import get_current_user_id

insights_bp = Blueprint("insights", __name__)


@insights_bp.route("/insights", methods=["GET"])
@jwt_required()
def insights():
    start = parse_optional_date(request.args.get("start_date"), "start_date")
    end = parse_optional_date(request.args.get("end_date"), "end_date")
    if start and end and start > end:
        raise APIError("start_date não pode ser posterior a end_date.", status_code=422)
    data = insights_service.build_insights(
        get_current_user_id(),
        start_date=start,
        end_date=end,
    )
    return jsonify(data), 200


@insights_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
