"""Carrega e valida corpo JSON com schemas Marshmallow."""
from flask import request
from marshmallow import ValidationError

from app.errors import APIError


def load_json(schema, *, partial: bool = False):
    """
    Lê request.json, valida com o schema e retorna os dados carregados.
    partial=True permite atualização parcial (ex.: PUT com alguns campos).
    """
    if not request.is_json:
        raise APIError(
            "Content-Type deve ser application/json.",
            status_code=415,
        )
    raw = request.get_json(silent=True)
    if raw is None:
        raise APIError("Corpo JSON inválido ou vazio.", status_code=400)
    try:
        return schema.load(raw, partial=partial)
    except ValidationError as exc:
        raise APIError(
            "Erro de validação nos dados enviados.",
            status_code=422,
            payload={"details": exc.messages},
        ) from exc
