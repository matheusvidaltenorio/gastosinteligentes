"""
Rotas públicas de autenticação: registro e login (JWT).
As demais rotas exigem cabeçalho Authorization: Bearer <access_token>.
"""
from flask import Blueprint, jsonify

from app.errors import APIError
from app.schemas import UserLoginSchema, UserRegisterSchema, UserResponseSchema
from app.services import auth_service
from app.utils.validation import load_json

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

user_out = UserResponseSchema()


@auth_bp.route("/register", methods=["POST"])
def register():
    """Cadastro de novo usuário; retorna dados do usuário (sem senha)."""
    data = load_json(UserRegisterSchema())
    user = auth_service.register_user(
        nome=data["nome"],
        email=data["email"],
        senha=data["senha"],
    )
    return jsonify(user_out.dump(user)), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login: retorna access_token (JWT) e user_id."""
    data = load_json(UserLoginSchema())
    result = auth_service.authenticate_user(
        email=data["email"],
        senha=data["senha"],
    )
    return jsonify(result), 200


@auth_bp.errorhandler(APIError)
def handle_api_error(err: APIError):
    return jsonify(err.to_dict()), err.status_code
