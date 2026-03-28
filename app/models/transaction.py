"""Transação financeira vinculada a um usuário (receita ou despesa)."""
from decimal import Decimal

from app.extensions import db


class TransactionType:
    """Constantes de tipo — evita magic strings espalhadas no código."""

    RECEITA = "RECEITA"
    DESPESA = "DESPESA"
    ALL = (RECEITA, DESPESA)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo = db.Column(db.String(20), nullable=False, index=True)
    valor = db.Column(db.Numeric(12, 2), nullable=False)
    categoria = db.Column(db.String(100), nullable=False, index=True)
    descricao = db.Column(db.Text, nullable=False, default="")
    data = db.Column(db.Date, nullable=False, index=True)

    user = db.relationship("User", back_populates="transactions")

    def valor_decimal(self) -> Decimal:
        return Decimal(str(self.valor))

    def __repr__(self):
        return f"<Transaction {self.tipo} {self.valor}>"
