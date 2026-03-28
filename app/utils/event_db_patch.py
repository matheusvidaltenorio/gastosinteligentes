"""Adiciona colunas novas em SQLite (projetos sem Alembic). Idempotente."""
from sqlalchemy import inspect, text

from app.extensions import db


def apply_event_schema_patches() -> None:
    engine = db.engine
    insp = inspect(engine)
    tables = insp.get_table_names()
    if "split_events" not in tables:
        return

    def cols(table: str) -> set[str]:
        return {c["name"] for c in insp.get_columns(table)}

    with engine.begin() as conn:
        se = cols("split_events")
        stmts: list[str] = []
        if "descricao" not in se:
            stmts.append("ALTER TABLE split_events ADD COLUMN descricao TEXT DEFAULT ''")
        if "tipo_divisao" not in se:
            stmts.append(
                "ALTER TABLE split_events ADD COLUMN tipo_divisao VARCHAR(20) DEFAULT 'igual'"
            )
        if "status" not in se:
            stmts.append(
                "ALTER TABLE split_events ADD COLUMN status VARCHAR(20) DEFAULT 'aberto'"
            )
        if "updated_at" not in se:
            stmts.append(
                "ALTER TABLE split_events ADD COLUMN updated_at DATETIME"
            )
        for s in stmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass

        insp = inspect(engine)
        ep = cols("event_participants")
        pstmts: list[str] = []
        if "telefone" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN telefone VARCHAR(30) DEFAULT ''")
        if "email" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN email VARCHAR(255) DEFAULT ''")
        if "valor_pago" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN valor_pago NUMERIC(12,2) DEFAULT 0")
        if "status_pagamento" not in ep:
            pstmts.append(
                "ALTER TABLE event_participants ADD COLUMN status_pagamento VARCHAR(20) DEFAULT 'pendente'"
            )
        if "peso" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN peso NUMERIC(12,4) DEFAULT 1")
        if "pix_code" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN pix_code TEXT")
        if "pix_qr_code_base64" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN pix_qr_code_base64 TEXT")
        if "payment_token" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN payment_token VARCHAR(64)")
        if "updated_at" not in ep:
            pstmts.append("ALTER TABLE event_participants ADD COLUMN updated_at DATETIME")
        for s in pstmts:
            try:
                conn.execute(text(s))
            except Exception:
                pass
        try:
            conn.execute(
                text(
                    "UPDATE split_events SET tipo_divisao = 'igual' "
                    "WHERE tipo_divisao IS NULL OR tipo_divisao = ''"
                )
            )
            conn.execute(
                text(
                    "UPDATE split_events SET status = 'aberto' "
                    "WHERE status IS NULL OR status = ''"
                )
            )
            conn.execute(
                text(
                    "UPDATE event_participants SET status_pagamento = 'pendente' "
                    "WHERE status_pagamento IS NULL OR status_pagamento = ''"
                )
            )
        except Exception:
            pass

    insp = inspect(engine)
    if "event_payment_logs" not in insp.get_table_names():
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS event_payment_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        participant_id VARCHAR(36) NOT NULL,
                        event_id INTEGER NOT NULL,
                        valor NUMERIC(12, 2) NOT NULL,
                        metodo VARCHAR(20) NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        comprovante_url VARCHAR(500),
                        observacao TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(participant_id) REFERENCES event_participants(id) ON DELETE CASCADE,
                        FOREIGN KEY(event_id) REFERENCES split_events(id) ON DELETE CASCADE
                    )
                    """
                )
            )
