# Technical Specification for AI Developer: Proactive AI-Agent for CEOs (MVP)

## 1. Project Context & Architecture Overview
You are tasked with building an MVP for a B2B SaaS application — a "Proactive AI-Agent" that helps wholesale CEOs manage working capital. 
**Architecture:**
We are using a **Monorepo approach with Payload CMS 3.0+ integrated directly into Next.js (App Router)**.
* **Backend / Headless CMS:** Payload CMS 3.0 (running on Next.js App Router).
* **Database:** MongoDB (via Mongoose, Payload's default db adapter).
* **Frontend (CEO Web App & Landing):** Next.js App Router, Tailwind CSS, `shadcn/ui`.
* **Authentication:** Payload CMS Auth combined with Google OAuth for users (CEOs).

The development must be executed strictly in **3 Phases**.

---

## 2. Phase 1: Admin Setup, Payload Config & Core Base

**Goal:** Initialize Payload CMS, define MongoDB collections, create the Admin panel (`/admin`), and set up the foundation for multi-tenant data management.

### 2.1 Payload Collections & Globals Setup
Define the following schemas in Payload CMS:

1. **Users (Collection):**
   * Fields: `role` (enum: 'admin', 'ceo'), `email`, `name`, `hasCompletedOnboarding` (boolean, default: false).
   * Auth: Enabled (configured for Google OAuth).
   * Access Control: Admins can see all; CEOs can only read/update their own document.
2. **Global Settings (Global):**
   * Fields: `appMode` (radio: 'prototype', 'production'), `allowedEmails` (array of strings - Allowlist for CEO registration).
3. **AIPrompts (Collection):**
   * Fields: `type` (string), `promptText` (textarea).
   * Use case: Admin stores system prompts for AI analysis here.
4. **DataTemplates (Collection):**
   * Upload enabled (to store `.csv` files representing 1C ERP exports like debtors, inventory).
   * Fields: `dataType` (select: 'debtors', 'cashflow', 'inventory').
5. **Insights (Collection) - The AI Actions:**
   * Fields: `owner` (relationship to Users), `type` (string), `priority` (select), `title` (string), `description` (string), `ai_draft` (text), `status` (select: 'new', 'in_progress', 'resolved', 'stuck').
   * Access: Read/Update restricted to `owner` or `admin`.

### 2.2 First Admin Setup
* Configure Payload to allow the creation of the first Admin user via the `/admin` UI on the first run.

### 2.3 The App Gatekeeper (CEO Login)
* Create a custom login page at `/auth` (using Next.js frontend).
* Implement Google OAuth. 
* **Crucial Logic:** Upon successful Google OAuth callback, check if the user's email exists in the `allowedEmails` array in Global Settings. If not, deny access. If yes, log them in as `ceo` and redirect to `/app`.

---

## 3. Phase 2: Onboarding Flow & Prototype Data Seeding

**Goal:** Implement the CEO Onboarding UX and the backend logic that clones prototype data.

### 3.1 CEO Routing Logic
When a CEO accesses `/app`:
* Check `req.user.hasCompletedOnboarding`.
* If `false`, redirect to `/app/onboarding`.
* If `true`, redirect to `/app/dashboard`.

### 3.2 Onboarding UX (Frontend)
Build a multi-step UI (`/app/onboarding`) using `shadcn/ui` components:
1. **Welcome Screen:** Explains the AI Agent.
2. **Data Connection:** A mock UI showing "Connecting to 1C Accounting...".
3. **Analysis Loader:** A 3-4 second skeleton loader saying "Analyzing working capital using AI...".
4. **Notification Settings:** Dummy toggles for Push, Telegram, Email.

### 3.3 The "Magic" Seeding Endpoint (Backend API)
Create a Next.js Route Handler or Payload Custom Endpoint (e.g., `POST /api/seed-prototype-data`).
When step 3 of the onboarding is reached, the frontend calls this endpoint:
1. The server checks the Global `appMode`. If `prototype`:
2. It bypasses actual CSV parsing for now and directly injects the following **Mock Data** into the `Insights` collection, setting the `owner` to the current CEO's ID.
3. Sets the user's `hasCompletedOnboarding` to `true`.

**Mock Data to Inject (Strictly in Russian):**
```json[
  {
    "type": "Токсичный должник",
    "priority": "high",
    "title": "ООО «Вектор» задерживает оплату",
    "description": "Срок неоплаты по УПД №4581 превысил отсрочку по договору на 18 дней. Сумма долга: 1 250 000 руб.",
    "ai_draft": "Draft: Досудебная претензия с расчетом пени. Рекомендуется передать юристу или главному бухгалтеру.",
    "status": "new"
  },
  {
    "type": "Угроза ликвидности",
    "priority": "critical",
    "title": "Риск кассового разрыва через 4 дня",
    "description": "Прогноз выплат поставщикам на этой неделе (2.8 млн руб.) превышает текущий остаток на счетах и ожидаемые поступления. Дефицит: 900 000 руб.",
    "ai_draft": "Draft: Сгенерировано письмо лояльному поставщику (ООО «Альфа Трейд») с просьбой сдвинуть платеж на 5 дней.",
    "status": "new"
  },
  {
    "type": "Мертвый неликвид",
    "priority": "medium",
    "title": "Замороженный капитал: Герметик PRO-500",
    "description": "Товар на сумму 840 000 руб. лежит на складе без движения более 90 дней. Остаток: 1200 шт.",
    "ai_draft": "Draft: Найдены топ-3 прошлых покупателя. Сгенерирован WhatsApp-оффер со скидкой 15%.",
    "status": "new"
  }
]
```

### 3.4 Core CEO Workspace (Frontend `/app/*`)
Build a Mobile-First PWA interface layout with a Bottom Navigation Bar:
* **Tab 1: Входящие (Inbox):** Fetches `Insights` where `status === 'new'` for the current CEO. Displays them as interactive cards. Includes a button "Взять в работу" (Approve) that updates the status to `in_progress`.
* **Tab 2: Исполнение (Tasks):** A Kanban or list view fetching `Insights` grouped by statuses: `in_progress`, `resolved`, `stuck`. Allows the CEO to manually change statuses.

---

## 4. Phase 3: Landing Page & CMS Integration

**Goal:** Build a marketing landing page powered by Payload CMS content.

### 4.1 Landing Page Content Collection
Create a `Pages` collection in Payload to manage Landing Page content block dynamically (or use Payload Globals for a single-page setup):
* Blocks: Hero Section, Problem Statement (Ситуация), How it Works (Схема работы), Security, Pricing, CTA.

### 4.2 Next.js Landing Page Frontend (`/`)
* Build a responsive, modern landing page matching the B2B FinTech vibe (Dark blue/white/gray).
* Fetch content dynamically using Payload's Local API (`const payload = await getPayload({ config })`).
* Implement the main Call-to-Action button: "Регистрация через Google Account", which redirects to `/auth`.

---

## 5. Execution Rules for the AI Assistant
1. **Initialize Payload 3.0:** Use `npx create-payload-app@latest` with the Next.js App Router template. Select MongoDB as the database.
2. **Step-by-Step:** DO NOT jump to frontend until Payload Collections (Phase 1) and role-based access controls are fully implemented and tested.
3. **Multi-tenancy Security:** Ensure that every API route or Payload Local API call in the `/app` directory strictly passes the `req.user.id` to filter `Insights`. A CEO must never see another CEO's data.
4. **Styling:** Use Tailwind CSS. For complex UI elements (Cards, Dialogs, Selects, Tabs), use `shadcn/ui` components.
5. Provide the code in logical chunks, starting with Payload Configuration (`payload.config.ts` and Collections definitions).