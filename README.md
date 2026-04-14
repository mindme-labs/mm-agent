# MMLabs AI-Advisor

Proactive AI agent for working capital management in wholesale companies. Analyzes financial data from 1C accounting, identifies risks, and generates actionable recommendations with ready-to-send letters and offers.

## Stack

- **Framework:** Next.js 15+ (App Router, TypeScript)
- **CMS:** Payload CMS 3.0+ (MongoDB, Mongoose adapter)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Icons:** Lucide React
- **Font:** Inter (Google Fonts)
- **Deploy:** Vercel (auto-deploy on push to `main`)

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB instance (local or Atlas)
- Anthropic API key (optional — falls back to rules engine)

### Setup

```bash
git clone https://github.com/mindme-labs/mm-agent.git
cd mm-agent
npm install
```

Create `.env` in the project root:

```env
MONGODB_URI=mongodb+srv://...
PAYLOAD_SECRET=your-random-secret-32-chars
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...  # optional
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

Always run `npx tsc --noEmit` before pushing to catch type errors.

## Architecture

```
src/
├── app/
│   ├── (frontend)/          # User-facing pages
│   │   ├── app/             # Authenticated app (inbox, tasks, data)
│   │   ├── auth/            # Login, register, request access
│   │   └── page.tsx         # Teaser landing
│   ├── (payload)/           # Payload CMS admin
│   └── api/                 # API routes
├── collections/             # Payload CMS collection configs
├── components/              # React components
├── globals/                 # Payload global configs
├── lib/
│   ├── ai/                  # AI client, prompts, audit
│   ├── parser/              # CSV parser for 7 account types
│   └── rules/               # 9 business rules + metrics engine
└── demo-data/               # Sample CSV files
```

## Key Features

- **9 business rules** — receivables, payables, inventory, margins, payment cycles, data quality
- **AI audit** — Claude-powered working capital analysis with fallback to deterministic rules
- **Financial metrics** — revenue, COGS, margins, turnover days, health index
- **Task management** — take recommendations to work, track deadlines, overdue alerts
- **Event logging** — 16 event types for full user lifecycle audit
- **Responsive** — mobile-first with desktop sidebar layout
- **PWA** — installable as a mobile app

## Admin Panel

Accessible at `/8ca90f70` (obscured route). Requires admin role.

## License

MIT
