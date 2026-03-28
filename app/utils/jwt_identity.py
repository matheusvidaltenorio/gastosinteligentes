"""Identidade JWT normalizada para int (evita 500 com sub malformado)."""
from flask_jwt_extended import get_jwt_identity

from app.errors import APIError


def get_current_user_id() -> int:
    """
    Lê o claim `sub` do JWT como user id inteiro.
    Tokens emitidos pela API usam str(user.id); valores não numéricos viram 401.
    """
    raw = get_jwt_identity()
    if raw is None:
        raise APIError("Autenticação necessária.", status_code=401)
    try:
        uid = int(str(raw).strip())
    except (TypeError, ValueError):
        raise APIError("Token inválido.", status_code=401) from None
    if uid < 1:
        raise APIError("Token inválido.", status_code=401)
    return uid
