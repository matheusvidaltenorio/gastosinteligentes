"""Rotas que servem a interface web interativa (painel + SPA React)."""
from pathlib import Path

from flask import Blueprint, abort, redirect, render_template, send_file

ui_bp = Blueprint("ui", __name__)

# frontend/dist após `npm run build` na pasta frontend/
_REACT_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

# Se pedirem um arquivo estático conhecido e não existir, 404 (evita devolver HTML no lugar do .js).
_STATIC_SUFFIXES = frozenset(
    {
        ".js",
        ".css",
        ".map",
        ".svg",
        ".ico",
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".woff2",
        ".ttf",
    }
)


@ui_bp.route("/painel")
def painel():
    """Dashboard: login, lançamentos, saldo, insights e gráfico por categoria."""
    return render_template("painel.html")


@ui_bp.route("/app")
def react_app_trailing():
    return redirect("/app/", code=302)


@ui_bp.route("/app/", defaults={"filepath": ""})
@ui_bp.route("/app/<path:filepath>")
def react_spa(filepath: str):
    """
    App React (Vite) compilado — dashboard fintech, metas, filtros, etc.
    Usa pathlib + send_file (Windows-safe). Antes, relpath + send_from_directory
    podia falhar e servir index.html para /app/assets/*.js → tela branca.
    """
    dist = _REACT_DIST
    if not dist.is_dir():
        return (
            "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'><title>App não compilado</title>"
            "<style>body{font-family:system-ui;max-width:36rem;margin:2rem auto;padding:0 1rem}</style>"
            "</head><body><h1>Frontend React não encontrado</h1>"
            "<p>Na pasta do projeto, execute:</p>"
            "<pre style='background:#f4f4f4;padding:1rem'>cd frontend\nnpm install\nnpm run build</pre>"
            "<p>Depois recarregue esta página.</p>"
            "<p><a href='/painel'>Painel HTML (legado)</a> · <a href='/'>Início</a></p></body></html>",
            503,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    dist_resolved = dist.resolve()

    if filepath:
        candidate = (dist / filepath).resolve()
        try:
            candidate.relative_to(dist_resolved)
        except ValueError:
            candidate = None
        if candidate is not None and candidate.is_file():
            resp = send_file(candidate)
            # Cache busting natural pelos hashes do Vite; assets podem cachear.
            if candidate.suffix.lower() in _STATIC_SUFFIXES:
                resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return resp

        suf = Path(filepath).suffix.lower()
        if suf in _STATIC_SUFFIXES:
            abort(404)

    resp = send_file(dist / "index.html")
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    return resp
