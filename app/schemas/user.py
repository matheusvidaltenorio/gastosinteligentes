"""Schemas Marshmallow para cadastro e resposta de usuário."""
from marshmallow import Schema, fields, validate

from app.extensions import ma


class UserRegisterSchema(ma.Schema):
    """Entrada: registro — senha em texto; o serviço faz o hash."""

    nome = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    senha = fields.String(
        required=True,
        validate=validate.Length(min=8, max=128),
        load_only=True,
    )


class UserLoginSchema(ma.Schema):
    """Entrada: login."""

    email = fields.Email(required=True)
    senha = fields.String(required=True, load_only=True)


class UserResponseSchema(ma.Schema):
    """Saída: dados públicos do usuário (nunca expõe hash)."""

    id = fields.Integer(dump_only=True)
    nome = fields.String()
    email = fields.String()
