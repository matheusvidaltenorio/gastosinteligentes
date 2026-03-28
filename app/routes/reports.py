"""
Relatórios para gráficos e análise mensal (diferenciais de portfólio).
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.errors import APIError
from app.services import report_service
from app.utils.dates import parse_optional_date, parse_required_month_year
from app.utils.jwt_identity import get_current_user_id

reports_bp = Blueprint("reports", __name__, url_prefix="/reports")


@reports_bp.route("/spending-by-category", methods=["GET"])
@jwt_required()
def spending_by_category():
    start = parse_optional_date(request.args.get("start_date"), "start_date")
    end = parse_optional_date(request.args.get("end_date"), "end_date")
    if start and end and start > end:
        raise APIError("start_date não pode ser posterior a end_date.", status_code=422)
    data = report_service.spending_by_category(
        get_current_user_id(),
        start_date=start,
        end_date=end,
    )
    return jsonify({"itens": data}), 200


@reports_bp.route("/category-ranking", methods=["GET"])
@jwt_required()
def category_ranking():
    start = parse_optional_date(request.args.get("start_date"), "start_date")
    end = parse_optional_date(request.args.get("end_date"), "end_date")
    if start and end and start > end:
        raise APIError("start_date não pode ser posterior a end_date.", status_code=422)
    data = report_service.category_ranking(
        get_current_user_id(),
        start_date=start,
        end_date=end,
    )
    return jsonify({"ranking": data}), 200


@reports_bp.route("/monthly-summary", methods=["GET"])
@jwt_required()
def monthly_summary():
    year_s = request.args.get("year")
    month_s = request.args.get("month")
    if not year_s or not month_s:
        raise APIError("Informe query params 'year' e 'month'.", status_code=422)
    year, month = parse_required_month_year(year_s, month_s)
    data = report_service.monthly_summary(get_current_user_id(), year, month)
    return jsonify(data), 200


@reports_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
