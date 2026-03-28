"""Integração: saldo, resumo mensal e isolamento de tipos (SQLite em memória)."""
import unittest
from datetime import date
from decimal import Decimal

from app import create_app
from app.config import Config
from app.extensions import db
from app.models import Transaction, User
from app.models.transaction import TransactionType
from app.errors import APIError
from app.services.balance_service import compute_balance
from app.services.report_service import monthly_summary
from app.services import transaction_service


class _TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class TestFinancialIntegration(unittest.TestCase):
    def setUp(self):
        self.app = create_app(_TestConfig)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        u = User(nome="Tester", email="t@example.com", password_hash="dummy")
        db.session.add(u)
        db.session.commit()
        self.uid = u.id

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def _tx(self, tipo: str, valor: str | Decimal, *, day: int = 15):
        t = Transaction(
            user_id=self.uid,
            tipo=tipo,
            valor=Decimal(str(valor)),
            categoria="Cat",
            descricao="",
            data=date(2025, 1, day),
        )
        db.session.add(t)
        db.session.commit()

    def test_balance_soma_receitas_despesas_saldo(self):
        self._tx(TransactionType.RECEITA, "1000.50")
        self._tx(TransactionType.DESPESA, "250.25")
        b = compute_balance(self.uid)
        self.assertEqual(b["total_receitas"], "1000.50")
        self.assertEqual(b["total_despesas"], "250.25")
        self.assertEqual(b["saldo_final"], "750.25")

    def test_balance_multiplas_no_mesmo_dia(self):
        self._tx(TransactionType.DESPESA, "10.99", day=7)
        self._tx(TransactionType.DESPESA, "0.01", day=7)
        self._tx(TransactionType.RECEITA, "100.00", day=7)
        b = compute_balance(self.uid)
        self.assertEqual(b["total_despesas"], "11.00")
        self.assertEqual(b["total_receitas"], "100.00")
        self.assertEqual(b["saldo_final"], "89.00")

    def test_monthly_summary_nao_conta_tipo_desconhecido_como_despesa(self):
        self._tx(TransactionType.RECEITA, "100")
        self._tx(TransactionType.DESPESA, "40")
        rogue = Transaction(
            user_id=self.uid,
            tipo="LEGADO_INVALIDO",
            valor=Decimal("9999.00"),
            categoria="X",
            descricao="",
            data=date(2025, 1, 3),
        )
        db.session.add(rogue)
        db.session.commit()
        m = monthly_summary(self.uid, 2025, 1)
        self.assertEqual(m["total_receitas"], "100.00")
        self.assertEqual(m["total_despesas"], "40.00")
        self.assertEqual(m["saldo"], "60.00")

    def test_balance_valor_alto_quantizado(self):
        self._tx(TransactionType.RECEITA, "9999999999.99")
        self._tx(TransactionType.DESPESA, "0.01")
        b = compute_balance(self.uid)
        self.assertEqual(b["saldo_final"], "9999999999.98")

    def test_isolamento_usuario_transacao(self):
        self._tx(TransactionType.RECEITA, "50")
        tx = Transaction.query.filter_by(user_id=self.uid).first()
        self.assertIsNotNone(tx)
        other = User(nome="Outro", email="outro@example.com", password_hash="dummy")
        db.session.add(other)
        db.session.commit()
        with self.assertRaises(APIError) as ctx:
            transaction_service.get_transaction(tx.id, other.id)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
