"""Validação Marshmallow de transações (sem Flask app)."""
import unittest
from datetime import date

from marshmallow import ValidationError

from app.schemas.transaction import TransactionCreateSchema, TransactionUpdateSchema


class TestTransactionSchema(unittest.TestCase):
    def test_categoria_apenas_espacos_rejeitada(self):
        with self.assertRaises(ValidationError):
            TransactionCreateSchema().load(
                {
                    "tipo": "DESPESA",
                    "valor": "10.00",
                    "categoria": "     ",
                    "data": date(2025, 1, 1),
                }
            )

    def test_valor_acima_do_limite_numeric_12_2(self):
        with self.assertRaises(ValidationError):
            TransactionCreateSchema().load(
                {
                    "tipo": "DESPESA",
                    "valor": "10000000000.00",
                    "categoria": "X",
                    "data": date(2025, 1, 1),
                }
            )

    def test_valor_no_teto_permitido(self):
        data = TransactionCreateSchema().load(
            {
                "tipo": "RECEITA",
                "valor": "9999999999.99",
                "categoria": "Limite",
                "data": date(2025, 1, 1),
            }
        )
        self.assertEqual(str(data["valor"]), "9999999999.99")

    def test_update_categoria_vazia_apos_strip_rejeita(self):
        with self.assertRaises(ValidationError):
            TransactionUpdateSchema().load({"categoria": "  \t  "}, partial=True)


if __name__ == "__main__":
    unittest.main()
