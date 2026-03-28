"""Eventos de divisão de gastos (despesas compartilhadas / vaquinha)."""
import uuid

from sqlalchemy import func

from app.extensions import db


class SplitEvent(db.Model):
    __tablename__ = "split_events"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=False, default="")
    valor_total = db.Column(db.Numeric(12, 2), nullable=False)
    codigo = db.Column(db.String(10), unique=True, nullable=False, index=True)
    tipo_divisao = db.Column(db.String(20), nullable=False, default="igual")
    status = db.Column(db.String(20), nullable=False, default="aberto")
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
    )

    user = db.relationship("User", backref=db.backref("split_events", lazy="dynamic"))
    participants = db.relationship(
        "EventParticipant",
        back_populates="event",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="EventParticipant.created_at",
    )


class EventParticipant(db.Model):
    __tablename__ = "event_participants"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    nome = db.Column(db.String(120), nullable=False)
    telefone = db.Column(db.String(30), nullable=False, default="")
    email = db.Column(db.String(255), nullable=False, default="")
    event_id = db.Column(
        db.Integer,
        db.ForeignKey("split_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    valor_devido = db.Column(db.Numeric(12, 2), nullable=False)
    valor_pago = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    status_pagamento = db.Column(db.String(20), nullable=False, default="pendente")
    peso = db.Column(db.Numeric(12, 4), nullable=False, default=1)
    pago = db.Column(db.Boolean, nullable=False, default=False)
    pix_code = db.Column(db.Text, nullable=True)
    pix_qr_code_base64 = db.Column(db.Text, nullable=True)
    payment_token = db.Column(db.String(64), nullable=True, unique=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
    )

    event = db.relationship("SplitEvent", back_populates="participants")


class EventPaymentLog(db.Model):
    __tablename__ = "event_payment_logs"

    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(
        db.String(36),
        db.ForeignKey("event_participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_id = db.Column(
        db.Integer,
        db.ForeignKey("split_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    valor = db.Column(db.Numeric(12, 2), nullable=False)
    metodo = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    comprovante_url = db.Column(db.String(500), nullable=True)
    observacao = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
