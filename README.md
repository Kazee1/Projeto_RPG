# 🎲 MindRender

![Linguagem](https://img.shields.io/badge/language-TypeScript-3178C6)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-000000)
![Automação](https://img.shields.io/badge/automação-n8n-EF4F2D)
![Banco](https://img.shields.io/badge/banco-Supabase-3ECF8E)
![Versão](https://img.shields.io/badge/version-0.1.0-blue)

Aplicação web de RPG narrativo com IA. O usuário cria campanhas solo em diferentes sistemas de RPG — escolhas, combate, inventário e progressão são gerados por IA e persistidos em tempo real.

---

## ✨ Funcionalidades

- Autenticação com Supabase (login, cadastro, verificação por e-mail)
- Criação de crônicas com sistema, classe, gênero, dificuldade e atributos
- Limite de 3 crônicas ativas por usuário
- Sessão de jogo com narrativa incremental, escolhas contextuais e testes com d20
- Combate com opções de ataque, HP, CA, XP e ouro
- Inventário, equipamentos, quests e localização persistidos
- Integração com n8n para geração narrativa via IA (Mistral)
- Perfil de usuário e preferências de sistema
- Biblioteca de histórias com busca e filtros

---

## 🛠️ Tecnologias

| Camada | Stack |
|--------|-------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Auth & Banco | Supabase (Auth, REST, Realtime) |
| Automação | n8n (Docker), Mistral AI |
| Utilitários | lucide-react, react-markdown |

---

## ✅ Pré-requisitos

- Node.js e npm
- Docker e Docker Compose
- Projeto Supabase com autenticação por e-mail habilitada
- Instância do n8n (local via Docker ou hospedada)

---

## 📥 Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/Kazee1/Projeto_RPG.git
cd Projeto_RPG

# 2. Subir o n8n
cd back-n8n
cp .env.example .env
docker compose up -d

# 3. Instalar dependências do frontend
cd ../front
npm install
```

### Configurar o n8n

1. Acesse `http://localhost:5678`
2. Importe `back-n8n/workflows.json`
3. Configure as credenciais: **Header Auth**, **Supabase API** e **Mistral Cloud API**
4. Ative o workflow

---

## 🔐 Variáveis de ambiente

Crie `front/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
NEXT_PUBLIC_N8N_START_WEBHOOK=http://localhost:5678/webhook/start-game
NEXT_PUBLIC_N8N_CONTINUE_WEBHOOK=http://localhost:5678/webhook/storie
NEXT_PUBLIC_N8N_RESUME_WEBHOOK=http://localhost:5678/webhook/resumo
NEXT_PUBLIC_N8N_ATTACK_WEBHOOK=http://localhost:5678/webhook/attack
NEXT_PUBLIC_N8N_API_KEY=<chave-do-header-api-rpg>
```

### Tabelas necessárias no Supabase

O projeto espera as seguintes tabelas criadas no banco:

`profiles` · `user_settings` · `stories` · `messages` · `items` · `equipment` · `choices` · `attack_choices` · `story_likes` · `world_flags`

> O repositório ainda não possui migrations versionadas. Crie as tabelas manualmente antes de usar o fluxo principal de jogo.

---

## ▶️ Como rodar

```bash
# n8n
cd back-n8n && docker compose up -d

# Frontend
cd front && npm run dev   # http://localhost:3000
```

**Fluxo recomendado:** suba o n8n → importe e ative o workflow → configure `.env.local` → rode o frontend → crie uma conta e acesse `/NewGame`.

---

## 🗂️ Estrutura

```
Projeto_RPG/
├── back-n8n/
│   ├── docker-compose.yml     # Container n8n local
│   ├── .env.example           # Variáveis do container
│   └── workflows.json         # Workflow exportado (webhooks + IA + Supabase)
└── front/
    ├── app/
    │   ├── api/game/          # API Routes que encaminham chamadas ao n8n
    │   │   ├── start/         # Inicia aventura
    │   │   ├── continue/      # Continua narrativa
    │   │   ├── resume/        # Gera resumo
    │   │   └── attack/        # Opções de combate
    │   ├── auth/callback/     # Callback do Supabase Auth
    │   ├── home/              # Dashboard com crônicas do usuário
    │   ├── NewGame/           # Criação de personagem e crônica
    │   ├── game/[id]/         # Sessão de jogo
    │   ├── arquivos/          # Biblioteca de histórias
    │   ├── profile/           # Perfil do usuário
    │   └── ...                # login, register, configuracao, comunidade
    ├── components/            # Header, Sidebar, MindRenderLayout
    ├── utils/supabase/        # Clientes Supabase browser/server
    └── proxy.ts               # Proteção de rotas e redirecionamentos
```

---

## 🌐 Endpoints

### API Routes (Next.js)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/auth/callback` | Finaliza autenticação e redireciona |
| `POST` | `/api/game/start` | Inicia aventura via n8n |
| `POST` | `/api/game/continue` | Continua narrativa via n8n |
| `POST` | `/api/game/resume` | Gera resumo da crônica |
| `POST` | `/api/game/attack` | Gera opções de ataque |

### Webhooks n8n

| Rota | Descrição |
|------|-----------|
| `/webhook/start-game` | Criação inicial da aventura |
| `/webhook/storie` | Continuação narrativa |
| `/webhook/resumo` | Resumo da história |
| `/webhook/attack` | Geração de ataques |

---

