"""CRUD e listagem filtrada de transações (sempre escopado ao usuário)."""
from datetime import date
from decimal import Decimal

from app.errors import APIError
from app.extensions import db
from app.models import Transaction


def _get_owned_or_404(transaction_id: int, user_id: int) -> Transaction:
    tx = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
    if not tx:
        raise APIError("Transação não encontrada.", status_code=404)
    return tx


def create_transaction(
    user_id: int,
    tipo: str,
    valor: Decimal,
    categoria: str,
    descricao: str,
    data: date,
) -> Transaction:
    tx = Transaction(
        user_id=user_id,
        tipo=tipo,
        valor=valor,
        categoria=categoria.strip(),
        descricao=(descricao or "").strip(),
        data=data,
    )
    db.session.add(tx)
    db.session.commit()
    return tx


def list_transactions(
    user_id: int,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    categoria: str | None = None,
    tipo: str | None = None,
):
    q = Transaction.query.filter_by(user_id=user_id)
    if start_date is not None:
        q = q.filter(Transaction.data >= start_date)
    if end_date is not None:
        q = q.filter(Transaction.data <= end_date)
    if categoria:
        q = q.filter(Transaction.categoria.ilike(categoria.strip()))
    if tipo:
        q = q.filter(Transaction.tipo == tipo)
    return q.order_by(Transaction.data.desc(), Transaction.id.desc()).all()


def get_transaction(transaction_id: int, user_id: int) -> Transaction:
    return _get_owned_or_404(transaction_id, user_id)


def update_transaction(
    transaction_id: int,
    user_id: int,
    *,
    tipo=None,
    valor=None,
    categoria=None,
    descricao=None,
    data=None,
) -> Transaction:
    tx = _get_owned_or_404(transaction_id, user_id)
    if tipo is not None:
        tx.tipo = tipo
    if valor is not None:
        tx.valor = valor
    if categoria is not None:
        tx.categoria = categoria.strip()
    if descricao is not None:
        tx.descricao = descricao.strip()
    if data is not None:
        tx.data = data
    db.session.commit()
    return tx


def delete_transaction(transaction_id: int, user_id: int) -> None:
    tx = _get_owned_or_404(transaction_id, user_id)
    db.session.delete(tx)
    db.session.commit()
