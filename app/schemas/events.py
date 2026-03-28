"""Schemas para eventos de divisão de gastos."""
from decimal import Decimal

from marshmallow import fields, pre_load, validate, validates

from app.extensions import ma

_MAX_VALOR = Decimal("9999999999.99")


class EventCreateSchema(ma.Schema):
    nome = fields.String(required=True, validate=validate.Length(min=1, max=200))
    valor_total = fields.Decimal(required=True, places=2, as_string=True)
    participantes = fields.List(
        fields.String(validate=validate.Length(min=1, max=120)),
        required=True,
        validate=validate.Length(min=1, max=100),
    )

    @pre_load
    def _strip_nome(self, data, **_kwargs):
        if isinstance(data, dict) and isinstance(data.get("nome"), str):
            data = dict(data)
            data["nome"] = data["nome"].strip()
        return data

    @validates("valor_total")
    def _valor_positivo(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("O valor total deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")


class ParticipantPatchSchema(ma.Schema):
    valor_devido = fields.Decimal(places=2, as_string=True, allow_none=True)
    pago = fields.Boolean(allow_none=True)

    @validates("valor_devido")
    def _valor_devido(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("valor_devido deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")


class ParticipantPublicPaySchema(ma.Schema):
    pago = fields.Boolean(required=True)


class ParticipantResponseSchema(ma.Schema):
    id = fields.String()
    nome = fields.String()
    valor_devido = fields.Decimal(places=2, as_string=True)
    pago = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)


class EventDetailResponseSchema(ma.Schema):
    id = fields.Integer()
    nome = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    codigo = fields.String()
    user_id = fields.Integer()
    created_at = fields.DateTime()
    participants = fields.Nested(ParticipantResponseSchema, many=True)


class EventListItemSchema(ma.Schema):
    id = fields.Integer()
    nome = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    codigo = fields.String()
    created_at = fields.DateTime()
    participantes_count = fields.Method("get_participantes_count")

    def get_participantes_count(self, obj):
        return len(obj.participants) if obj.participants is not None else 0


class EventPublicResponseSchema(ma.Schema):
    nome = fields.String()
    codigo = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    participants = fields.Nested(ParticipantResponseSchema, many=True)
