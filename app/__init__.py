"""
Factory da aplicação Flask — ponto único de configuração e extensões.

Fluxo típico de uma requisição:
1. Blueprint (routes) recebe HTTP e valida entrada (Marshmallow / utils).
2. Service aplica regras de negócio e usa Models + SQLAlchemy.
3. Resposta JSON padronizada; erros viram APIError ou handlers JWT.
"""
import os

from flask import Flask, jsonify, request

from app.config import get_config
from app.errors import APIError
from app.extensions import bcrypt, db, jwt, ma
from app.routes.auth import auth_bp
from app.routes.balance import balance_bp
from app.routes.events import events_bp
from app.routes.insights import insights_bp
from app.routes.reports import reports_bp
from app.routes.transactions import transactions_bp
from app.routes.ui import ui_bp


def create_app(config_class=None):
    app = Flask(__name__)
    cfg = config_class or get_config()
    app.config.from_object(cfg)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)

    _register_jwt_handlers(app)
    _register_error_handlers(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(balance_bp)
    app.register_blueprint(insights_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(ui_bp)

    _cors = os.getenv("CORS_ORIGINS", "").strip()
    if _cors:
        from flask_cors import CORS

        CORS(
            app,
            origins=[o.strip() for o in _cors.split(",") if o.strip()],
            allow_headers=["Content-Type", "Authorization"],
            methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        )

    @app.route("/", methods=["GET"])
    def root():
        """
        Página inicial: navegadores pedem HTML; clientes REST podem pedir JSON.
        Evita a impressão de 'site em branco' ao abrir só a URL base.
        """
        prefer_json = request.args.get("format") == "json" or (
            request.accept_mimetypes.best_match(["application/json", "text/html"])
            == "application/json"
        )
        if not prefer_json:
            return (
                "<!DOCTYPE html>"
                "<html lang='pt-BR'><head><meta charset='utf-8'>"
                "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                "<title>Controle de Gastos Inteligente — API</title>"
                "<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5}"
                "code{background:#f4f4f4;padding:0.15rem 0.4rem;border-radius:4px}"
                "ul{padding-left:1.2rem}</style></head><body>"
                "<h1>Controle de Gastos Inteligente</h1>"
                "<p><a href='/app/' style='font-weight:700;font-size:1.1rem'>Abrir app React (recomendado)</a> — dashboard fintech, metas, gráficos e filtros.</p>"
                "<p><a href='/painel'>Painel HTML (legado)</a> — mesmo servidor, interface clássica.</p>"
                "<p>Também é uma <strong>API REST</strong>: use <strong>Postman</strong> ou <strong>Insomnia</strong> se preferir.</p>"
                "<p>Status: <a href='/health'><code>GET /health</code></a></p>"
                "<h2>Endpoints principais</h2><ul>"
                "<li><code>POST /auth/register</code> e <code>POST /auth/login</code></li>"
                "<li><code>GET/POST /transactions</code> (demais rotas com JWT)</li>"
                "<li><code>GET /balance</code>, <code>GET /insights</code></li>"
                "<li><code>GET /reports/...</code> (veja README)</li>"
                "</ul>"
                "<p>Envie <code>Accept: application/json</code> nesta URL para receber JSON com a mesma informação.</p>"
                "</body></html>"
            ), 200, {"Content-Type": "text/html; charset=utf-8"}

        return (
            jsonify(
                nome="Controle de Gastos Inteligente API",
                tipo="REST",
                mensagem="Use Postman/Insomnia ou autenticação JWT nas rotas protegidas.",
                links={
                    "health": "/health",
                    "app_react": "/app/",
                    "painel_html": "/painel",
                },
                rotas_publicas=["POST /auth/register", "POST /auth/login"],
                rotas_protegidas_exemplo=[
                    "GET /transactions",
                    "GET /balance",
                    "GET /insights",
                ],
            ),
            200,
        )

    @app.route("/health", methods=["GET"])
    def health():
        """Útil para load balancer / plataformas de deploy."""
        return jsonify(status="ok"), 200

    with app.app_context():
        db.create_all()
        from app.utils.event_db_patch import apply_event_schema_patches

        apply_event_schema_patches()

    return app


def _register_jwt_handlers(app):
    """Respostas JSON consistentes quando o JWT falha ou expira."""

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify(error="Autenticação necessária.", detail=str(reason)), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify(error="Token inválido.", detail=str(error)), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify(error="Token expirado."), 401


def _register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(err: APIError):
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify(error="Recurso não encontrado."), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify(error="Método HTTP não permitido para esta URL."), 405

    @app.errorhandler(500)
    def internal_error(_e):
        return jsonify(error="Erro interno do servidor."), 500
