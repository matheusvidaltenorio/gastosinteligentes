# Frontend — Controle de Gastos Inteligente

React + Vite + TypeScript + Tailwind CSS + Axios, consumindo a API Flask.

## Estrutura

- `src/components/ui` — Button, Input, Card, Modal, Table, etc.
- `src/components/layout` — AppShell, Sidebar, Navbar
- `src/components/transactions` — modal de lançamento
- `src/pages` — Login, Register, Dashboard, Transações, Insights
- `src/services` — cliente Axios e chamadas à API
- `src/context` — autenticação (JWT em `localStorage`)
- `src/hooks` — toasts globais
- `src/styles` — Tailwind + tokens

## Desenvolvimento

1. Suba o backend Flask na porta **5000** (`python run.py`).
2. Na pasta `frontend`:

```bash
npm install
npm run dev
```

Abra **http://127.0.0.1:5173**. O Vite encaminha `/auth`, `/transactions`, `/balance`, `/insights` e `/reports` para o Flask (veja `vite.config.ts`).

## Produção / deploy separado

1. Defina `VITE_API_URL` com a URL pública da API (ex.: `https://api.exemplo.com`, **sem** barra final).
2. No servidor Flask, defina CORS, por exemplo no `.env`:

```env
CORS_ORIGINS=http://localhost:5173,https://app.seudominio.com
```

3. Build estático:

```bash
npm run build
```

Sirva a pasta `dist` (Netlify, Vercel, S3+CloudFront, nginx).

## Scripts

| Comando        | Descrição        |
| -------------- | ---------------- |
| `npm run dev`  | Servidor Vite    |
| `npm run build`| Build otimizado  |
| `npm run preview` | Testa o `dist` |
