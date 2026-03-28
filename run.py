"""
Ponto de entrada para desenvolvimento.

Produção: use um servidor WSGI (gunicorn, waitress) apontando para
`app:create_app` — ex.: `gunicorn "app:create_app()"`.
"""
import os

from app import create_app
from app.config import get_config

config_class = get_config()
app = create_app(config_class)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_ENV", "development") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)
