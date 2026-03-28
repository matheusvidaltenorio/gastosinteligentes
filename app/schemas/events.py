"""Schemas para eventos de divisão de gastos."""
from decimal import Decimal

from marshmallow import fields, pre_load, validate, validates, validates_schema

from app.extensions import ma

_MAX_VALOR = Decimal("9999999999.99")
_TIPOS_DIV = ("igual", "manual", "proporcional")
_EVENT_STATUS = ("aberto", "encerrado", "concluido")


class EventCreateSchema(ma.Schema):
    nome = fields.String(required=True, validate=validate.Length(min=1, max=200))
    descricao = fields.String(load_default="", validate=validate.Length(max=4000))
    valor_total = fields.Decimal(required=True, places=2, as_string=True)
    tipo_divisao = fields.String(
        load_default="igual", validate=validate.OneOf(_TIPOS_DIV)
    )
    participantes = fields.Raw(required=True)

    @pre_load
    def _strip_and_normalize(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if isinstance(d.get("nome"), str):
            d["nome"] = d["nome"].strip()
        if isinstance(d.get("descricao"), str):
            d["descricao"] = d["descricao"].strip()
        ps = d.get("participantes")
        if isinstance(ps, list) and ps and isinstance(ps[0], str):
            d["participantes"] = [
                {"nome": str(x).strip()} for x in ps if str(x).strip()
            ]
        return d

    @validates("valor_total")
    def _valor_positivo(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("O valor total deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")

    @validates_schema
    def _participantes_ok(self, data, **_kwargs):
        ps = data.get("participantes")
        if not isinstance(ps, list) or len(ps) < 1:
            raise validate.ValidationError("Informe ao menos um participante.")
        if len(ps) > 100:
            raise validate.ValidationError("Máximo de 100 participantes.")
        for item in ps:
            if isinstance(item, dict):
                n = (item.get("nome") or "").strip()
                if not n:
                    raise validate.ValidationError("Cada participante precisa de nome.")
            else:
                raise validate.ValidationError("Formato inválido em participantes.")


class EventUpdateSchema(ma.Schema):
    nome = fields.String(validate=validate.Length(min=1, max=200), allow_none=True)
    descricao = fields.String(validate=validate.Length(max=4000), allow_none=True)
    status = fields.String(validate=validate.OneOf(_EVENT_STATUS), allow_none=True)

    @pre_load
    def _strip(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if isinstance(d.get("nome"), str):
            d["nome"] = d["nome"].strip()
        if isinstance(d.get("descricao"), str):
            d["descricao"] = d["descricao"].strip()
        return d


class SplitCalculateSchema(ma.Schema):
    valor_total = fields.Decimal(required=True, places=2, as_string=True)
    tipo_divisao = fields.String(
        required=True, validate=validate.OneOf(_TIPOS_DIV)
    )
    participantes = fields.Raw(required=True)

    @pre_load
    def _normalize(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        ps = d.get("participantes")
        if isinstance(ps, list) and ps and isinstance(ps[0], str):
            d["participantes"] = [
                {"nome": str(x).strip()} for x in ps if str(x).strip()
            ]
        return d

    @validates("valor_total")
    def _valor_positivo(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("O valor total deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")

    @validates_schema
    def _participantes_ok(self, data, **_kwargs):
        ps = data.get("participantes")
        if not isinstance(ps, list) or len(ps) < 1:
            raise validate.ValidationError("Informe ao menos um participante.")
        if len(ps) > 100:
            raise validate.ValidationError("Máximo de 100 participantes.")
        for item in ps:
            if isinstance(item, dict):
                n = (item.get("nome") or "").strip()
                if not n:
                    raise validate.ValidationError("Cada participante precisa de nome.")
            else:
                raise validate.ValidationError("Formato inválido em participantes.")


class AddParticipantSchema(ma.Schema):
    nome = fields.String(required=True, validate=validate.Length(min=1, max=120))
    telefone = fields.String(load_default="", validate=validate.Length(max=30))
    email = fields.String(load_default="", validate=validate.Length(max=255))
    valor_devido = fields.Decimal(places=2, as_string=True, allow_none=True)
    peso = fields.Integer(load_default=1, validate=validate.Range(min=1, max=10000))

    @pre_load
    def _strip(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if isinstance(d.get("nome"), str):
            d["nome"] = d["nome"].strip()
        if isinstance(d.get("telefone"), str):
            d["telefone"] = d["telefone"].strip()
        if isinstance(d.get("email"), str):
            d["email"] = d["email"].strip()
        return d


class ParticipantPatchSchema(ma.Schema):
    nome = fields.String(validate=validate.Length(min=1, max=120), allow_none=True)
    telefone = fields.String(validate=validate.Length(max=30), allow_none=True)
    email = fields.String(validate=validate.Length(max=255), allow_none=True)
    valor_devido = fields.Decimal(places=2, as_string=True, allow_none=True)
    valor_pago = fields.Decimal(places=2, as_string=True, allow_none=True)
    pago = fields.Boolean(allow_none=True)
    status_pagamento = fields.String(
        validate=validate.OneOf(("pendente", "pago", "parcial")), allow_none=True
    )
    peso = fields.Integer(validate=validate.Range(min=1, max=10000), allow_none=True)

    @pre_load
    def _strip(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        d = dict(data)
        for k in ("nome", "telefone", "email"):
            if isinstance(d.get(k), str):
                d[k] = d[k].strip()
        return d

    @validates("valor_devido")
    def _valor_devido(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("valor_devido deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")

    @validates("valor_pago")
    def _valor_pago(self, value, **_kwargs):
        if value is None:
            return
        if value < 0:
            raise validate.ValidationError("valor_pago não pode ser negativo.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")


class ParticipantPublicPaySchema(ma.Schema):
    pago = fields.Boolean(required=True)


class PaymentConfirmSchema(ma.Schema):
    valor = fields.Decimal(required=True, places=2, as_string=True)
    metodo = fields.String(required=True, validate=validate.OneOf(("pix", "manual")))
    observacao = fields.String(allow_none=True, validate=validate.Length(max=2000))
    comprovante_url = fields.String(
        allow_none=True, validate=validate.Length(max=500)
    )

    @validates("valor")
    def _valor(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("valor deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido.")


class ParticipantResponseSchema(ma.Schema):
    id = fields.String()
    nome = fields.String()
    telefone = fields.String()
    email = fields.String()
    valor_devido = fields.Decimal(places=2, as_string=True)
    valor_pago = fields.Decimal(places=2, as_string=True)
    status_pagamento = fields.String()
    peso = fields.Decimal(places=4, as_string=True)
    pago = fields.Boolean()
    pix_code = fields.String(allow_none=True)
    pix_qr_code_base64 = fields.String(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class EventDetailResponseSchema(ma.Schema):
    id = fields.Integer()
    nome = fields.String()
    descricao = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    codigo = fields.String()
    tipo_divisao = fields.String()
    status = fields.String()
    user_id = fields.Integer()
    created_at = fields.DateTime()
    updated_at = fields.DateTime(allow_none=True)
    participants = fields.Nested(ParticipantResponseSchema, many=True)


class EventListItemSchema(ma.Schema):
    id = fields.Integer()
    nome = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    codigo = fields.String()
    tipo_divisao = fields.String()
    status = fields.String()
    created_at = fields.DateTime()
    participantes_count = fields.Method("get_participantes_count")

    def get_participantes_count(self, obj):
        return len(obj.participants) if obj.participants is not None else 0


class EventPublicParticipantSchema(ma.Schema):
    id = fields.String()
    nome = fields.String()
    valor_devido = fields.Decimal(places=2, as_string=True)
    valor_pago = fields.Decimal(places=2, as_string=True)
    status_pagamento = fields.String()
    pago = fields.Boolean()
    pix_code = fields.String(allow_none=True)
    pix_qr_code_base64 = fields.String(allow_none=True)


class EventPublicResponseSchema(ma.Schema):
    nome = fields.String()
    descricao = fields.String()
    codigo = fields.String()
    valor_total = fields.Decimal(places=2, as_string=True)
    tipo_divisao = fields.String()
    status = fields.String()
    participants = fields.Nested(EventPublicParticipantSchema, many=True)
