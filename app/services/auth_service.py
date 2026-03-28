"""Lógica de cadastro e autenticação (hash bcrypt + JWT)."""
from flask_jwt_extended import create_access_token

from app.errors import APIError
from app.extensions import bcrypt, db
from app.models import User


def register_user(nome: str, email: str, senha: str) -> User:
    email_normalizado = email.strip().lower()
    if User.query.filter_by(email=email_normalizado).first():
        raise APIError("E-mail já cadastrado.", status_code=409)

    user = User(
        nome=nome.strip(),
        email=email_normalizado,
        password_hash=bcrypt.generate_password_hash(senha).decode("utf-8"),
    )
    db.session.add(user)
    db.session.commit()
    return user


def authenticate_user(email: str, senha: str) -> dict:
    """Retorna access_token e dados do usuário ou levanta APIError."""
    email_normalizado = email.strip().lower()
    user = User.query.filter_by(email=email_normalizado).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, senha):
        raise APIError("E-mail ou senha inválidos.", status_code=401)

    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "token_type": "Bearer", "user_id": user.id}
