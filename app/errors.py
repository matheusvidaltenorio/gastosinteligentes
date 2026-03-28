"""Exceções de domínio e mapeamento para respostas HTTP JSON."""


class APIError(Exception):
    """Erro de negócio ou recurso com código HTTP e payload opcional."""

    def __init__(self, message, status_code=400, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}

    def to_dict(self):
        body = {"error": self.message}
        body.update(self.payload)
        return body
