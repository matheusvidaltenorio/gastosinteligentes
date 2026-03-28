"""Validação de transações: valores positivos e tipo permitido."""
from decimal import Decimal

from marshmallow import fields, pre_load, validate, validates

from app.extensions import ma
from app.models.transaction import TransactionType

# Alinhado a Transaction.valor: Numeric(12, 2) → 10 dígitos inteiros + 2 decimais
_MAX_VALOR = Decimal("9999999999.99")


class _StripStringsMixin:
    @pre_load
    def _strip_strings(self, data, **_kwargs):
        if not isinstance(data, dict):
            return data
        out = dict(data)
        if "categoria" in out and isinstance(out["categoria"], str):
            out["categoria"] = out["categoria"].strip()
        if "descricao" in out and isinstance(out.get("descricao"), str):
            out["descricao"] = out["descricao"].strip()
        return out


class TransactionCreateSchema(_StripStringsMixin, ma.Schema):
    tipo = fields.String(
        required=True,
        validate=validate.OneOf(list(TransactionType.ALL)),
    )
    valor = fields.Decimal(required=True, places=2, as_string=True)
    categoria = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100),
    )
    descricao = fields.String(load_default="", validate=validate.Length(max=2000))
    data = fields.Date(required=True)

    @validates("valor")
    def validate_valor_positivo(self, value, **_kwargs):
        # Marshmallow 4+ repassa argumentos extras (ex.: data_key) aos validadores.
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("O valor deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido para o sistema.")

    @validates("categoria")
    def validate_categoria_nao_vazia(self, value, **_kwargs):
        if value is None or not str(value).strip():
            raise validate.ValidationError("Informe uma categoria.")


class TransactionUpdateSchema(_StripStringsMixin, ma.Schema):
    """Atualização parcial: todos os campos opcionais."""

    tipo = fields.String(validate=validate.OneOf(list(TransactionType.ALL)))
    valor = fields.Decimal(places=2, as_string=True)
    categoria = fields.String(validate=validate.Length(min=1, max=100))
    descricao = fields.String(validate=validate.Length(max=2000))
    data = fields.Date()

    @validates("valor")
    def validate_valor_positivo(self, value, **_kwargs):
        if value is None:
            return
        if value <= 0:
            raise validate.ValidationError("O valor deve ser maior que zero.")
        if value > _MAX_VALOR:
            raise validate.ValidationError("Valor acima do limite permitido para o sistema.")

    @validates("categoria")
    def validate_categoria_nao_vazia(self, value, **_kwargs):
        if value is None:
            return
        if not str(value).strip():
            raise validate.ValidationError("Informe uma categoria.")


class TransactionResponseSchema(ma.Schema):
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(dump_only=True)
    tipo = fields.String()
    valor = fields.Decimal(places=2, as_string=True)
    categoria = fields.String()
    descricao = fields.String()
    data = fields.Date()
