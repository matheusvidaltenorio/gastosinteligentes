"""Configuração da aplicação (12-factor: valores sensíveis vêm do ambiente)."""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuração base usada em desenvolvimento e como referência."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///expenses.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # URL pública do app React (sem barra final), ex.: https://meusite.com/app ou http://127.0.0.1:5173/app
    # Usada em links de WhatsApp e link_publico quando Origin/Referer não estão disponíveis.
    FRONTEND_PUBLIC_URL = os.getenv("FRONTEND_PUBLIC_URL", "").strip().rstrip("/")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    # Cabeçalho Authorization: Bearer <token>
    JWT_TOKEN_LOCATION = ("headers",)
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"


class ProductionConfig(Config):
    """Produção: exige chaves definidas no ambiente."""

    SECRET_KEY = os.environ["SECRET_KEY"]
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", os.environ["SECRET_KEY"])


def get_config():
    """Retorna a classe de config conforme FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development")
    if env == "production":
        return ProductionConfig
    return Config
