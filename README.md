# Controle de Gastos Inteligente — API (Flask)

API REST para registrar receitas e despesas, calcular saldo, filtrar transações e obter insights agregados. Autenticação com **JWT**; persistência com **SQLite** por padrão (configurável para PostgreSQL via `DATABASE_URL`).

## Arquitetura (resumo)

| Camada | Pasta | Responsabilidade |
|--------|--------|------------------|
| Config | `app/config.py` | Chaves, JWT, URI do banco (12-factor) |
| Modelos | `app/models/` | Entidades SQLAlchemy e relacionamentos |
| Schemas | `app/schemas/` | Validação e serialização (Marshmallow) |
| Serviços | `app/services/` | Regras de negócio (sem HTTP) |
| Rotas | `app/routes/` | Blueprints REST, auth JWT, query params |
| Utilidades | `app/utils/` | Datas ISO, validação de JSON |

A factory `create_app()` em `app/__init__.py` inicializa extensões, registra blueprints e cria tabelas em desenvolvimento.

## Requisitos

- Python 3.10 ou superior (recomendado)
- `pip`

## Como rodar (desenvolvimento)

```powershell
cd "c:\Users\Matheus\Desktop\Controle de Gastos Inteligente"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edite .env e defina SECRET_KEY e JWT_SECRET_KEY em ambiente real
python run.py
```

A API sobe em `http://127.0.0.1:5000` (porta alterável com variável `PORT`).

- Saúde: `GET /health`
- Banco SQLite padrão: arquivo `expenses.db` na pasta do projeto.

### PostgreSQL (opcional)

No `.env`:

```env
DATABASE_URL=postgresql+psycopg2://usuario:senha@localhost:5432/gastos
```

Instale o driver adequado (ex.: `psycopg2-binary`) e ajuste `requirements.txt` se necessário.

### Produção (exemplo)

```powershell
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 "run:app"
```

Use `FLASK_ENV=production` e chaves fortes em variáveis de ambiente (`ProductionConfig` exige `SECRET_KEY`).

## Autenticação

1. `POST /auth/register` — corpo JSON: `nome`, `email`, `senha` (mín. 8 caracteres).
2. `POST /auth/login` — `email`, `senha` → resposta com `access_token`.
3. Demais rotas: cabeçalho `Authorization: Bearer <access_token>`.

## Endpoints principais

### Transações

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/transactions` | Cria transação |
| GET | `/transactions` | Lista (filtros opcionais abaixo) |
| GET | `/transactions/<id>` | Detalhe |
| PUT | `/transactions/<id>` | Atualização parcial |
| DELETE | `/transactions/<id>` | Remove |

**Filtros em GET** (query string): `start_date`, `end_date` (ISO `AAAA-MM-DD`), `categoria`, `tipo` (`RECEITA` ou `DESPESA`).

**Corpo POST/PUT (exemplo):**

```json
{
  "tipo": "DESPESA",
  "valor": "99.90",
  "categoria": "alimentação",
  "descricao": "Supermercado",
  "data": "2026-03-27"
}
```

Regras: `valor` > 0; `tipo` obrigatório e enumerado.

### Eventos / divisão de gastos

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/events` | JWT | Cria evento (`nome`, `valor_total`, `participantes`: lista de nomes); gera `codigo` único (ex.: `ABC123`) |
| GET | `/events` | JWT | Lista eventos do usuário |
| GET | `/events/<id>` | JWT | Detalhe com participantes |
| PATCH | `/events/<id>/participants/<participant_id>` | JWT | `valor_devido` e/ou `pago` (criador edita) |
| GET | `/events/code/<codigo>` | — | Visualização pública (nome, total, participantes, valores) |
| PATCH | `/events/code/<codigo>/participants/<participant_id>/paid` | — | Corpo `{"pago": true\|false}` — marcar pagamento sem login |

O valor total é dividido em partes iguais entre os nomes informados (centavos distribuídos nas primeiras fatias). No app React: **Eventos** (logado), **Entrar com código** e **`/app/evento/<codigo>`** (público).

### Saldo

`GET /balance` — opcional: `start_date`, `end_date`.

Resposta: `total_receitas`, `total_despesas`, `saldo_final` (strings decimais).

### Insights

`GET /insights` — opcional: `start_date`, `end_date`.

Inclui: dia da semana com maior gasto, categoria com maior gasto, média de despesas por dia (entre dias em que houve despesa), totais e `alerta` se despesas > receitas.

### Relatórios (extras)

| Rota | Descrição |
|------|-----------|
| GET `/reports/spending-by-category` | Totais por categoria (despesas), ordenados |
| GET `/reports/category-ranking` | Mesmo dado com posição |
| GET `/reports/monthly-summary?year=2026&month=3` | Resumo do mês |

Filtros de período opcionais: `start_date`, `end_date` nos dois primeiros.

## Testar (Postman / Insomnia)

1. Registrar e fazer login.
2. Copiar `access_token`.
3. Em requisições autenticadas, aba **Authorization** → Bearer Token, ou header manual `Authorization: Bearer ...`.

## Estrutura de pastas

```
app/
  __init__.py      # factory, JWT handlers, blueprints
  config.py
  errors.py
  extensions.py
  models/
  schemas/
  services/
  routes/
  utils/
run.py
requirements.txt
.env.example
```

## Segurança

- Senhas com **bcrypt** (via Flask-Bcrypt).
- Cada consulta de transação/saldo/insights filtra por `user_id` do JWT.
- Não commitar `.env` nem bancos locais em repositório público.
