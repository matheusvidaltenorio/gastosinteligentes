"""Eventos de divisão de gastos (despesas compartilhadas)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func

from app.extensions import db


class SplitEvent(db.Model):
    """Evita conflito de nome com o pacote sqlalchemy.event."""

    __tablename__ = "split_events"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False)
    valor_total = db.Column(db.Numeric(12, 2), nullable=False)
    codigo = db.Column(db.String(10), unique=True, nullable=False, index=True)
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
    event_id = db.Column(
        db.Integer,
        db.ForeignKey("split_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    valor_devido = db.Column(db.Numeric(12, 2), nullable=False)
    pago = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    event = db.relationship("SplitEvent", back_populates="participants")
