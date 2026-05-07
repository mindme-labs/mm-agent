# MMLabs AI-Advisor — Постановка для разработки

> **IDE:** Cursor  
> **Модель:** Claude Opus 4.6 MAX  
> **Полные требования:** файл `mmlabs-requirements-complete-v2.md` в корне проекта  
> **Демо-данные:** CSV-файлы ОСВ из 1С в папке `demo-data/`

---

## Общие правила для всех итераций

### Стек
- Next.js 15+ (App Router, TypeScript)
- Payload CMS 3.0+ (встроен в Next.js, работает на том же сервере)
- MongoDB (через Mongoose, Payload default adapter)
- Tailwind CSS 4 + shadcn/ui
- Lucide React (иконки)
- Шрифт Inter (Latin + Cyrillic) через `next/font/google`

### Структура проекта
```
src/
├── app/
│   ├── (frontend)/        # Группа маршрутов для CEO-приложения
│   │   ├── auth/          # Логин
│   │   └── app/           # Личный кабинет (layout + bottom nav)
│   │       ├── inbox/
│   │       ├── tasks/
│   │       ├── data/
│   │       └── onboarding/
│   ├── (payload)/         # Группа маршрутов Payload Admin
│   │   └── admin/
│   └── api/               # API endpoints
├── collections/           # Payload CMS collection configs
├── globals/               # Payload CMS global configs
├── components/            # React-компоненты
│   └── ui/                # shadcn/ui примитивы
├── lib/
│   ├── parser/            # Детерминированный парсер ОСВ
│   ├── rules/             # Rules engine
│   ├── ai/                # AI-сервис (Claude API)
│   └── logger.ts          # EventLog helper
├── types/                 # TypeScript типы
└── demo-data/             # CSV-файлы для демо-режима
```

### Правила кода
1. Все тексты интерфейса — на русском языке.
2. Все комментарии в коде — на английском.
3. `"use client"` — только для компонентов с хуками/интерактивностью.
4. Каждая коллекция Payload — отдельный файл в `src/collections/`.
5. API-вызовы к Payload — через Local API (`getPayload()`) на сервере, через REST API на клиенте.
6. Все ответы API оборачивать в try/catch с логированием ошибок.
7. Данные между CEO изолированы: каждый запрос фильтруется по `owner === req.user.id`.
8. **Адаптивная вёрстка (3 брейкпоинта):**
   - **Mobile** (< 768px): основной вид, контейнер на всю ширину, нижняя навигация (bottom nav).
   - **Tablet** (768px–1024px): контейнер `max-w-2xl mx-auto`, нижняя навигация.
   - **Desktop** (> 1024px): контейнер `max-w-6xl mx-auto`, боковая навигация (sidebar) вместо bottom nav, карточки в 2-колоночной сетке.
   Все тач-таргеты ≥ 44px на всех брейкпоинтах.
9. **Пре-прод гейт:** Переключение пользователя в режим `preprod` запрещено, если `ANTHROPIC_API_KEY` не задан в env. Проверка выполняется: (а) в админке при изменении поля `mode`, (б) в API при старте пре-прод онбординга. Если ключа нет — показать ошибку "Для работы пре-прод режима необходимо настроить AI-сервис (ANTHROPIC_API_KEY)".

### Завершение каждой итерации

После выполнения всех шагов итерации и проверки критерия готовности:

1. **Проверь build:** `npm run build` — без ошибок и warnings.
2. **Коммит в master:**
```bash
git add .
git commit -m "iter-N: краткое описание итерации"
git push origin master
```
3. **Деплой в Vercel:** Push в master автоматически запускает деплой (Vercel подключён к репозиторию). Дождись успешного билда.
4. **Ручное тестирование:** Открой production URL в Vercel, проверь новый функционал. Если есть баги — исправь, коммит, повторный деплой.

### Дизайн-система
- Фон: `bg-slate-50` (#f8fafc)
- Карточки: белые, `shadow-sm`, `rounded-xl`
- Акцент (AI): `indigo-600` (#4f46e5)
- Critical: `red-600`, High: `orange-500`, Medium: `yellow-500`, Low: `slate-400`
- Компоненты shadcn/ui: Card, Badge, Button, Tabs, Select, Progress, Skeleton, Textarea, Toast

### Адаптивная вёрстка

| Элемент | Mobile (< 768px) | Tablet (768–1024px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|--------------------|
| Контейнер | `w-full px-4` | `max-w-2xl mx-auto` | `max-w-6xl mx-auto` |
| Навигация | Bottom nav (fixed) | Bottom nav (fixed) | Sidebar (left, fixed, w-64) |
| Карточки рекомендаций | 1 колонка | 1 колонка | 2 колонки (`grid-cols-2`) |
| Финансовая сводка | 2×2 grid | 4 в ряд | 4 в ряд + раскрытый блок "Подробнее" |
| Таблицы (Data) | Горизонтальный скролл | Полная ширина | Полная ширина |
| Онбординг визард | Полный экран | Центрированная карточка `max-w-lg` | Центрированная карточка `max-w-lg` |
| Страница логина | Полный экран | Центрированная карточка | Центрированная карточка |

**Ключевые CSS-классы:**
```
// Основной контейнер контента
className="w-full px-4 md:max-w-2xl md:mx-auto lg:max-w-6xl lg:mx-auto"

// Сетка карточек
className="grid grid-cols-1 lg:grid-cols-2 gap-4"

// Навигация: скрыть bottom nav на desktop, показать sidebar
// Bottom nav: className="fixed bottom-0 ... lg:hidden"
// Sidebar:   className="hidden lg:fixed lg:flex lg:flex-col lg:w-64 lg:h-screen"

// Контент со сдвигом под sidebar на desktop
className="lg:ml-64"
```

---

## Итерация 0: Инициализация проекта

### Цель
Развёрнутый проект Next.js + Payload CMS + MongoDB, который стартует без ошибок, с пустой админкой на `/admin`.

### Шаги

1. Инициализируй проект:
```bash
npx create-payload-app@latest mmlabs-advisor --template blank --db mongodb
```

2. Настрой `payload.config.ts`:
   - `serverURL`: из env `PAYLOAD_PUBLIC_SERVER_URL`
   - `db`: mongooseAdapter, connection string из env `MONGODB_URI`
   - `admin`: path `/admin`
   - `typescript.outputFile`: `src/types/payload-types.ts`

3. Установи зависимости:
```bash
npm install lucide-react zustand
npx shadcn@latest init
npx shadcn@latest add card badge button tabs select progress skeleton textarea toast separator
```

4. Настрой `src/app/globals.css` с Tailwind v4.

5. Настрой `src/app/layout.tsx`:
   - Шрифт Inter (subsets: latin, cyrillic)
   - Metadata: title "AI-Advisor — Управление оборотным капиталом"

6. Создай `.env.example` и `.env` (с реальными значениями для MongoDB):
```
# База данных (уже развёрнута)
MONGODB_URI=mongodb+srv://iliafedorov_db_user:__EmCR0If0Gv1IfTUr@mm-cluster.cigkjoe.mongodb.net/?appName=mm-cluster

# Payload CMS (сгенерируй случайную строку ≥32 символа)
PAYLOAD_SECRET=your-random-secret-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI-сервис (обязателен для пре-прод режима)
ANTHROPIC_API_KEY=
```
**Важно:** `NEXTAUTH_SECRET` не нужен — мы используем Payload Auth, а не NextAuth.js.

7. Положи 7 CSV-файлов с демо-данными в `src/demo-data/`.

8. **Git init:**
```bash
git init
echo "node_modules/\n.env\n.next/" > .gitignore
git add .
git commit -m "iter-0: project init — Next.js + Payload CMS + MongoDB"
```

9. **Vercel подключение:**
   - Создай проект в Vercel, подключи к Git-репозиторию (GitHub/GitLab).
   - Задай environment variables в Vercel dashboard: `MONGODB_URI`, `PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL` (URL Vercel-проекта).
   - Push в master → автодеплой.

### Критерий готовности
- `npm run dev` стартует без ошибок
- `/admin` открывает Payload Admin UI с экраном создания первого пользователя
- shadcn/ui компоненты установлены и импортируются
- **Vercel:** проект задеплоен, `/admin` доступен по production URL
- **Git:** коммит `iter-0` в master

---

## Итерация 1: Коллекции Payload CMS

### Цель
Все коллекции и глобалы определены, видны в Payload Admin UI, access control настроен.

### Коллекции

Создай файлы коллекций. Для каждой указана структура полей — реализуй точно по спецификации.

**`src/collections/Users.ts`:**
```typescript
// Fields: email, name, role (admin|ceo), mode (demo|preprod|production),
// hasCompletedOnboarding (default false), companyName?, inn?, companyType? (ip|ooo)
// Auth: enabled
// Access: admin → all; ceo → own document only (read + update)
// HOOK beforeChange: если mode меняется на 'preprod' или 'production',
//   проверить process.env.ANTHROPIC_API_KEY. Если не задан —
//   бросить ValidationError("Для пре-прод режима необходимо настроить ANTHROPIC_API_KEY").
```

**`src/collections/UploadedFiles.ts`:**
```typescript
// Fields: owner (rel→Users), file (upload), originalName, detectedType,
// accountCode, period, parseStatus (pending|recognizing|parsing|success|warning|error),
// parseErrors (json?), parsedData (json), aiRecognitionLog (json?)
// Access: admin → all; ceo → where owner === user.id
```

**`src/collections/Recommendations.ts`:**
```typescript
// Fields: owner (rel→Users), ruleCode, ruleName, priority (critical|high|medium|low),
// title, description (textarea), shortRecommendation (textarea), fullText (textarea),
// status (new|in_progress|resolved|stuck|dismissed), impactMetric
// (accounts_receivable|accounts_payable|inventory|revenue|strategic),
// impactDirection (decrease|increase), impactAmount (number),
// sourceAccount, counterparty?, recipient, isDemo (default false),
// isAiGenerated (default false)
// Access: admin → all; ceo → where owner === user.id
```

**`src/collections/RecommendationFeedback.ts`:**
```typescript
// Fields: owner (rel→Users), recommendation (rel→Recommendations),
// rating (positive|negative), comment (textarea, max 500)?
// Access: admin → all; ceo → where owner === user.id
```

**`src/collections/AnalysisResults.ts`:**
```typescript
// Fields: owner (rel→Users), period, revenue, cogs, grossProfit, grossMargin,
// accountsReceivable, accountsPayable, inventory, shippedGoods,
// arTurnoverDays, apTurnoverDays, inventoryTurnoverDays,
// healthIndex (fine|issues|risky), topDebtors (json), topCreditors (json),
// aiAuditSummary (textarea?), isDemo (default false)
// Access: admin → all; ceo → where owner === user.id
```

**`src/collections/AIPrompts.ts`:**
```typescript
// Fields: promptKey (text, unique), name, systemPrompt (textarea),
// userPromptTemplate (textarea), version (number), isActive (checkbox)
// Access: admin only
```

**`src/collections/AIUsageLogs.ts`:**
```typescript
// Fields: owner (rel→Users), promptKey, inputTokens, outputTokens,
// model, cost (number), durationMs (number)
// Access: admin only (read), created programmatically
```

**`src/collections/EventLog.ts`:**
```typescript
// Fields: owner (rel→Users), eventType, entityType?, entityId?, payload (json?)
// Access: admin only (read), created programmatically
```

**`src/globals/GlobalSettings.ts`:**
```typescript
// Fields: allowedEmails (array of text), defaultMode (demo|preprod),
// aiEnabled (checkbox, default true), aiProvider (anthropic|openai),
// aiModel (text, default "claude-sonnet-4-20250514")
// Access: admin only
```

### Регистрация в Payload Config
Добавь все коллекции и глобал в `payload.config.ts`.

### Критерий готовности
- Все коллекции видны в `/admin`
- Можно создать запись в каждой коллекции через админку
- Access control работает (тест: создай ceo-пользователя, убедись, что он не видит чужие данные)

---

## Итерация 2: Аутентификация и маршрутизация

### Цель
Google OAuth логин, allowlist-гейт, маршрутизация по режиму и статусу онбординга.

### Шаги

1. **Google OAuth через Payload Auth.**
   Настрой стратегию Google OAuth в коллекции Users. Payload CMS 3.0 поддерживает кастомные auth strategies. При callback:
   - Проверь, есть ли email в `GlobalSettings.allowedEmails`.
   - Если нет → редирект на `/auth?error=not_allowed`.
   - Если да и пользователь новый → создай с `role: 'ceo'`, `mode: GlobalSettings.defaultMode`.
   - Если пользователь существует → залогинь.

2. **Страница логина** `src/app/(frontend)/auth/page.tsx`:
   - Заголовок: "AI-Агент: Управление оборотным капиталом"
   - Кнопка "Войти через Google" (стилизована под гугл).
   - При `?error=not_allowed` — сообщение: "Для доступа к сервису необходимо приглашение."
   - Минималистичный дизайн, центр экрана.

3. **Middleware** `src/middleware.ts`:
   - `/app/*` — требует аутентификацию, редирект на `/auth` если не залогинен.
   - `/app/onboarding` — доступен только если `hasCompletedOnboarding === false`.
   - `/app/inbox`, `/app/tasks`, `/app/data` — только если `hasCompletedOnboarding === true`.
   - `/admin` — оставить стандартный Payload auth.

4. **Layout приложения** `src/app/(frontend)/app/layout.tsx`:
   - Проверь `req.user`. Если нет → редирект.
   - Проверь `hasCompletedOnboarding`. Если false → редирект на onboarding.
   - Иначе → рендери children с нижней навигацией.

5. **EventLog:** Логируй `auth.login`, `auth.login_denied`, `auth.logout`.

### Критерий готовности
- Google OAuth работает
- Email не из allowlist — показывает ошибку
- Новый пользователь попадает на onboarding
- Повторный вход (с пройденным онбордингом) → inbox
- В EventLog есть записи о логине

---

## Итерация 3: Основной layout приложения

### Цель
Shell приложения с адаптивной навигацией (bottom nav на мобильных, sidebar на десктопе) и заглушками для трёх табов.

### Шаги

1. **BottomNav** `src/components/BottomNav.tsx`:
   - Фиксирован внизу, `backdrop-blur-sm`, три таба:
     - Входящие (Inbox icon) → `/app/inbox`
     - Мои задачи (CheckSquare icon) → `/app/tasks`  
     - Данные (FileSpreadsheet icon) → `/app/data`
   - Активный таб подсвечен `indigo-600`.
   - На табе "Входящие" — бейдж с количеством карточек в статусе `new`.
   - **Видимость:** `className="fixed bottom-0 inset-x-0 ... lg:hidden"` — скрыт на desktop.

2. **Sidebar** `src/components/Sidebar.tsx`:
   - Фиксирован слева, `w-64`, `h-screen`, белый фон, `border-r`.
   - Те же три пункта навигации, что и BottomNav (вертикальный список с иконками и текстом).
   - Логотип "AI-Advisor" сверху.
   - Имя пользователя и кнопка выхода внизу sidebar.
   - **Видимость:** `className="hidden lg:fixed lg:flex lg:flex-col lg:w-64 ..."` — только на desktop.

3. **AppHeader** `src/components/AppHeader.tsx`:
   - На mobile/tablet: логотип "AI-Advisor", имя пользователя, кнопка выхода.
   - На desktop: скрыт или минималистичный (навигация и user info — в Sidebar).
   - `className="lg:hidden"` для скрытия на desktop.

4. **AppLayout** `src/app/(frontend)/app/layout.tsx`:
   - Общий layout:
```tsx
<div className="min-h-dvh bg-slate-50">
  <Sidebar />           {/* hidden lg:flex */}
  <AppHeader />          {/* lg:hidden */}
  <main className="w-full px-4 pb-20 lg:pb-4 lg:ml-64 md:max-w-2xl md:mx-auto lg:max-w-none lg:mx-0">
    {children}
  </main>
  <BottomNav />          {/* lg:hidden */}
</div>
```
   - `pb-20` на mobile — отступ под bottom nav. `lg:pb-4` на desktop — нет bottom nav.
   - `lg:ml-64` — сдвиг контента под sidebar на desktop.

5. **Страницы-заглушки:**
   - `/app/inbox/page.tsx` → "Входящие — загрузка..."
   - `/app/tasks/page.tsx` → "Мои задачи — загрузка..."
   - `/app/data/page.tsx` → "Данные — загрузка..."

### Критерий готовности
- **Mobile:** bottom nav внизу, header сверху, контент на полную ширину
- **Tablet:** bottom nav, контент центрирован `max-w-2xl`
- **Desktop:** sidebar слева, bottom nav скрыт, контент занимает оставшееся пространство
- Навигация переключает табы на всех брейкпоинтах
- Logout работает (из header на mobile, из sidebar на desktop)
- **Git:** коммит `iter-3`, **Vercel:** задеплоен, проверен на телефоне и десктопе

---

## Итерация 4: Детерминированный парсер ОСВ

### Цель
Модуль, который парсит 7 типов CSV-файлов из демо-данных в структуру `ParsedAccountData`.

### Шаги

1. **Типы** `src/types/index.ts`:
```typescript
export interface ParsedAccountData {
  accountCode: string;
  period: string;
  totals: AccountTotals;
  entities: ParsedEntity[];
}

export interface AccountTotals {
  openingDebit: number;
  openingCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ParsedEntity {
  name: string;
  totals: AccountTotals;
  monthly: MonthlyData[];
}

export interface MonthlyData {
  month: string;          // "Январь 25"
  turnoverDebit: number;
  turnoverCredit: number;
  closingDebit: number;
  closingCredit: number;
}
```

2. **Парсер** `src/lib/parser/osv-parser.ts`:
   - Функция `parseOSVFile(fileContent: string): ParsedAccountData`
   - Алгоритм:
     a. Строка 1 → извлечь accountCode и period через regex: `по счету (.+?) за (.+)`.
     b. Найти строку с "Сальдо на начало периода" → определить маппинг колонок.
     c. Счета 10, 41 — 8 колонок (есть "Показатели"), пропускать строки с "Кол.".
     d. Счета 60, 62 — 7 колонок, группировка по контрагентам (для 60 — ещё по договорам, но договоры свернуть в контрагента).
     e. Счета 90.01, 90.02 — 7 колонок, группировка по номенклатурным группам.
     f. Счёт 45 — 8 колонок как 10/41, но по контрагентам.
     g. Числа: `.replace(/\s/g, '').replace(',', '.')` → `parseFloat()`. Пустые → 0.
     h. Типы строк: итого (первая колонка = номер счёта), сущность (текст, не "Обороты за", не "Итого"), месяц (начинается с "Обороты за").
   - Функция `identifyFile(fileContent: string): {accountCode: string, period: string} | null`

3. **Тесты:** Напиши unit-тесты, которые парсят все 7 демо-файлов из `src/demo-data/` и проверяют:
   - Правильный accountCode и period.
   - Итоговые суммы совпадают с "Итого" строкой файла.
   - Количество entities > 0.
   - Каждый entity имеет monthly записи.

### Критерий готовности
- Все 7 демо-файлов парсятся без ошибок
- Unit-тесты проходят
- Итоговые суммы сходятся с оригинальными файлами

---

## Итерация 5: Rules Engine

### Цель
Модуль, который принимает массив `ParsedAccountData` и возвращает массив рекомендаций.

### Шаги

1. **Типы рекомендации** `src/types/index.ts` (дополнить):
```typescript
export interface GeneratedRecommendation {
  ruleCode: string;       // "ДЗ-1", "ДЗ-2" и т.д.
  ruleName: string;       // Формальное название
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  shortRecommendation: string;
  fullText: string;
  impactMetric: 'accounts_receivable' | 'accounts_payable' | 'inventory' | 'revenue' | 'strategic';
  impactDirection: 'decrease' | 'increase';
  impactAmount: number;
  sourceAccount: string;
  counterparty?: string;
  recipient: string;
}
```

2. **Rules engine** `src/lib/rules/engine.ts`:
   - Функция `runRulesEngine(data: ParsedAccountData[]): GeneratedRecommendation[]`
   - Внутри вызывает каждое правило и собирает результаты.

3. **Отдельные правила** — по файлу на каждое в `src/lib/rules/`:
   - `dz1-overdue-receivable.ts` — Просроченная ДЗ (двухступенчатая)
   - `dz2-concentration.ts` — Критическая концентрация ДЗ
   - `dz3-customer-churn.ts` — Снижение активности покупателей
   - `kz1-unclosed-advances.ts` — Незакрытые авансы
   - `zap1-illiquid-inventory.ts` — Неликвидные запасы
   - `zap2-excess-inventory.ts` — Избыточные запасы
   - `pl1-margin-decline.ts` — Снижение рентабельности
   - `fc1-payment-cycle-imbalance.ts` — Дисбаланс платёжных циклов
   - `svs1-data-quality.ts` — Качество учётных данных

   Каждый файл экспортирует функцию `(data: ParsedAccountData[]) => GeneratedRecommendation[]`.

   Условия для каждого правила подробно описаны в `mmlabs-requirements-complete-v2.md`, раздел 5.4. Следуй им буквально.

4. **Шаблоны текстов** `src/lib/rules/templates.ts`:
   - Все шаблоны `fullText` из раздела 5.6 требований.
   - Функция `fillTemplate(template: string, vars: Record<string, string>): string`.
   - Переменные: `{counterparty}`, `{amount}`, `{months}`, `{deadline}`, `{companyName}` и т.д.

5. **Расчёт метрик** `src/lib/rules/metrics.ts`:
   - Функция `calculateMetrics(data: ParsedAccountData[]): AnalysisMetrics`
   - Из данных считает: revenue, cogs, grossProfit, grossMargin, AR, AP, inventory, turnover days, healthIndex, topDebtors, topCreditors.
   - Формулы:
     - `arTurnoverDays = (avgAR / revenueCreditTurnover) * periodDays`
     - `apTurnoverDays = (avgAP / cogsDebitTurnover) * periodDays`
     - `healthIndex`: AR/AP > 1.2 → "fine", 0.8–1.2 → "issues", < 0.8 → "risky"

6. **Тесты:** Прогони rules engine на демо-данных. Убедись, что генерируется ≥ 5 рекомендаций. Проверь, что ДЗ-2 (концентрация) и ЗАП-1 (неликвид) срабатывают на демо-данных.

### Критерий готовности
- Rules engine возвращает массив рекомендаций на демо-данных
- Каждая рекомендация имеет заполненный fullText с подставленными данными
- Метрики считаются корректно (проверь вручную по одному файлу)

---

## Итерация 6: Seed-скрипт и демо-данные

### Цель
Команда, которая заполняет БД демо-данными: парсит 7 CSV, прогоняет rules engine, создаёт AnalysisResults и Recommendations.

### Шаги

1. **Seed-скрипт** `src/seed.ts`:
   - Читает 7 CSV из `src/demo-data/`.
   - Парсит каждый через `parseOSVFile()`.
   - Прогоняет `runRulesEngine()`.
   - Вычисляет `calculateMetrics()`.
   - Сохраняет результаты как шаблоны (не привязанные к user, с `isDemo: true`).

2. **Функция привязки демо к пользователю** `src/lib/demo.ts`:
   - `seedDemoForUser(userId: string)` — копирует демо-AnalysisResults и демо-Recommendations для конкретного CEO, устанавливая `owner: userId`.
   - Вызывается при завершении онбординга в демо-режиме.

3. **Функция очистки демо** `src/lib/demo.ts`:
   - `clearDemoForUser(userId: string)` — удаляет все записи этого пользователя с `isDemo: true`.
   - Вызывается при логауте пользователя в демо-режиме.

4. Добавь скрипт в `package.json`:
```json
"scripts": {
  "seed": "tsx src/seed.ts"
}
```

### Критерий готовности
- `npm run seed` заполняет БД без ошибок
- В админке видны демо-рекомендации и результаты анализа
- `seedDemoForUser()` создаёт копии для конкретного пользователя

---

## Итерация 7: Онбординг (демо-режим)

### Цель
Пошаговый визард для демо-режима: приветствие → демо-файлы → анимация анализа → результат.

### Шаги

1. **Страница** `src/app/(frontend)/app/onboarding/page.tsx`:
   - Серверный компонент. Проверяет `user.mode` и направляет на нужный визард.

2. **Компонент визарда** `src/components/OnboardingWizard.tsx` (client):
   - State: `currentStep` (0–3).
   - **Шаг 0 — Приветствие:**
     - Текст: "Сейчас мы покажем, как сервис находит проблемы в ваших финансах и предлагает решения."
     - Кнопка "Начать демонстрацию".
   - **Шаг 1 — Демо-файлы:**
     - Список 7 файлов с иконками и названиями счетов (визуальный, не интерактивный).
     - Текст: "Загружены демонстрационные данные из 1С:Бухгалтерии."
     - Кнопка "Начать анализ".
   - **Шаг 2 — Анализ (анимация):**
     - Progress bar, 4 этапа с задержками по ~1 сек каждый:
       1. "Загрузка данных из 1С..."
       2. "Анализ дебиторской задолженности..."
       3. "Проверка складских остатков..."
       4. "Формирование рекомендаций..."
     - При показе шага → вызывать `POST /api/demo/seed` для привязки демо-данных к пользователю.
   - **Шаг 3 — Готово:**
     - "Диагностика завершена. Найдено N проблем, требующих внимания."
     - Кнопка "Перейти к результатам" → PATCH user `hasCompletedOnboarding: true` → redirect `/app/inbox`.

3. **API** `src/app/api/demo/seed/route.ts`:
   - `POST` — вызывает `seedDemoForUser(userId)`, возвращает количество созданных рекомендаций.
   - Только для пользователей с `mode: 'demo'`.

4. **EventLog:** Логируй `onboarding.start`, `onboarding.analysis_start`, `onboarding.analysis_complete`, `onboarding.complete`.

### Критерий готовности
- Визард проходится за 4 шага
- Анимация анализа выглядит убедительно
- После завершения в БД есть рекомендации для этого пользователя
- Редирект на inbox работает

---

## Итерация 8: Экран "Входящие" (Inbox)

### Цель
Главный экран CEO: финансовая сводка + карточки рекомендаций с действиями и обратной связью.

### Шаги

1. **Страница** `src/app/(frontend)/app/inbox/page.tsx`:
   - Серверный компонент. Fetch через Payload Local API:
     - `AnalysisResults` для текущего пользователя.
     - `Recommendations` где `status === 'new'` и `owner === user.id`, сортировка по priority.

2. **FinancialSummaryPanel** `src/components/FinancialSummaryPanel.tsx`:
   - 4 метрики: Выручка, ДЗ, КЗ, Кол-во рекомендаций.
   - Сетка: `grid grid-cols-2 md:grid-cols-4 gap-3`.
   - Формат: `₽ X.X млн` (делить на 1_000_000, округлять до 1 знака).
   - Раскрывающийся блок "Подробнее": Оборачиваемость ДЗ, КЗ, Валовая рентабельность. На desktop (lg) — раскрыт по умолчанию.
   - Health Index badge: 🟢 В норме / 🟡 Есть вопросы / 🔴 Риск.
   - Подпись: "Данные за {period}".

3. **Лента карточек — адаптивная сетка:**
   - Обёртка: `className="grid grid-cols-1 lg:grid-cols-2 gap-4"`.
   - Mobile/Tablet: карточки в одну колонку.
   - Desktop: карточки в две колонки.

4. **RecommendationCard** `src/components/RecommendationCard.tsx` (client):
   - Props: `recommendation`, `onStatusChange`, `onFeedback`.
   - UI по макету из требований:
     - Priority badge (цвет по приоритету) + ruleCode.
     - ruleName (формальное название).
     - Title (заголовок проблемы).
     - Impact tag (тапабельный, раскрывает сумму).
     - Description.
     - Short recommendation с иконкой 💡.
     - Кнопки: "Взять в работу" (primary) → status `in_progress`, "Отклонить" (secondary) → status `dismissed`.
     - CopyDraftButton — копирует fullText, показывает toast "Текст скопирован".
     - Feedback section: 👍/👎 + кнопка 💬 для комментария.

5. **CopyDraftButton** `src/components/CopyDraftButton.tsx`:
   - `navigator.clipboard.writeText()` с fallback на textarea+execCommand.
   - Иконка меняется на ✓ на 2 секунды.

6. **FeedbackSection** `src/components/FeedbackSection.tsx`:
   - 👍/👎 — одно нажатие, POST `/api/feedback`.
   - 💬 — раскрывает textarea (max 500 символов) + кнопка "Отправить".
   - После отправки: "Спасибо за отзыв".

7. **API endpoints:**
   - `PATCH /api/recommendations/[id]/status` — смена статуса. Проверка owner. Логирует `recommendation.status_changed`.
   - `POST /api/feedback` — создание RecommendationFeedback. Логирует `recommendation.feedback`.

8. **EventLog:** `recommendation.viewed`, `recommendation.status_changed`, `recommendation.text_copied`, `recommendation.feedback`.

### Критерий готовности
- Финансовая сводка показывает корректные цифры из демо
- Карточки отображаются, отсортированы по приоритету
- "Взять в работу" перемещает карточку (исчезает из Inbox)
- Копирование текста работает
- Обратная связь сохраняется в БД
- Все действия логируются

---

## Итерация 9: Экран "Мои задачи" (Tasks)

### Цель
Управление рекомендациями по статусам: табы, смена статуса, обратная связь.

### Шаги

1. **Страница** `src/app/(frontend)/app/tasks/page.tsx`:
   - Серверный компонент. Fetch `Recommendations` для текущего пользователя, все статусы кроме `new`.

2. **TaskManager** `src/components/TaskManager.tsx` (client):
   - shadcn/ui Tabs: "В работе", "Решены", "Отклонены", "Зависли".
   - Каждый таб — бейдж с количеством.
   - Внутри каждого таба — список карточек.
   - Карточки используют тот же `RecommendationCard`, но с Select для смены статуса вместо кнопок "Взять в работу"/"Отклонить".

3. **StatusSelect** `src/components/StatusSelect.tsx`:
   - shadcn/ui Select с опциями: В работе, Решена, Зависла, Отклонена.
   - При изменении → PATCH `/api/recommendations/[id]/status`.

### Критерий готовности
- Табы отображают правильное количество
- Смена статуса из dropdown работает
- Карточка перемещается между табами
- Обратная связь работает так же, как на Inbox

---

## Итерация 10: Экран "Данные" (Data)

### Цель
Просмотр загруженных файлов и расширенных метрик.

### Шаги

1. **Страница** `src/app/(frontend)/app/data/page.tsx`:
   - Серверный компонент. Fetch UploadedFiles и AnalysisResults.

2. **Секция "Загруженные файлы":**
   - Таблица: название, тип (ОСВ), счёт, период, статус (✅/⚠️).
   - В пре-прод: кнопка "Загрузить новые файлы" (реализуется в Итерации 14).

3. **Секция "Ключевые метрики":**
   - Таблица с метриками: выручка, себестоимость, валовая прибыль, рентабельность, ДЗ, КЗ, запасы, товары отгруженные.
   - Формат: числа с разделителями тысяч, рентабельность в %.

4. **Секция "Топ-5 дебиторов":**
   - Таблица: контрагент, сумма, доля от общей ДЗ (%).
   - Доля > 30% — подсветка красным.

5. **Секция "Топ-5 кредиторов":**
   - Таблица: контрагент, сумма, наличие авансов (да/нет).

### Критерий готовности
- Все секции отображают данные из демо
- Числа форматированы корректно
- Контрагенты с высокой концентрацией подсвечены

---

## Итерация 11: Логаут и очистка демо

### Цель
При логауте из демо-режима — стирание данных сессии. Полировка UI.

### Шаги

1. **Logout flow:**
   - При нажатии "Выйти":
     - Если `user.mode === 'demo'` → вызвать `clearDemoForUser(userId)` (удалить все записи с `isDemo: true`), сбросить `hasCompletedOnboarding: false`.
     - Логировать `auth.logout`.
     - Payload logout → redirect на `/auth`.

2. **Полировка:**
   - Проверь все переходы между экранами.
   - Пустые состояния: если нет рекомендаций → "Все рекомендации обработаны ✅".
   - Loading states: skeleton-лоадеры на всех экранах.
   - Ошибки: обработай случай, когда Payload недоступен.

3. **PWA (минимальная):**
   - `public/manifest.json` с названием, иконками (используй placeholder 192px и 512px), theme_color `#4f46e5`.
   - `<link rel="manifest">` в layout.
   - Минимальный service worker для installability.

### Критерий готовности
- Полный цикл демо-режима: логин → онбординг → inbox → действия → tasks → data → logout → повторный логин → снова онбординг
- Нет ошибок в консоли
- PWA устанавливается на телефон

---

## Итерация 12: Подготовка к пре-проду — EventLog middleware

### Цель
Убедиться, что логирование полное и надёжное, прежде чем добавлять пре-прод.

### Шаги

1. **Logger** `src/lib/logger.ts`:
```typescript
export async function logEvent(
  userId: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  payload?: Record<string, any>
): Promise<void>
```
   - Создаёт запись в EventLog через Payload Local API.
   - Не бросает исключений (только console.error).

2. Пройди по всем API endpoints и компонентам — убедись, что все события из раздела 9.2 требований логируются:
   - `auth.*`, `onboarding.*`, `file.*`, `recommendation.*`, `ai.*`, `page.view`.

3. В админке: добавь view для EventLog с фильтрами по eventType и owner.

### Критерий готовности
- Пройди весь демо-цикл, в EventLog появляются все ожидаемые записи
- В админке можно фильтровать логи по пользователю и типу события

---

## Итерация 13: AI-сервис (Claude API integration)

### Цель
Модуль взаимодействия с Claude API, промпты в БД, логирование вызовов.

### Шаги

1. **Установка:**
```bash
npm install @anthropic-ai/sdk
```

2. **AI-клиент** `src/lib/ai/client.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callAI(params: {
  systemPrompt: string;
  userPrompt: string;
  userId: string;
  promptKey: string;
  maxTokens?: number;
}): Promise<{content: string; inputTokens: number; outputTokens: number}>
```
   - Вызывает `anthropic.messages.create()`.
   - Модель из `GlobalSettings.aiModel`.
   - Логирует в `AIUsageLogs`: promptKey, tokens, cost, duration.
   - Логирует `ai.request` / `ai.response` / `ai.error` в EventLog.

3. **AI status endpoint** `src/app/api/ai/status/route.ts`:
   - `GET` — возвращает `{available: boolean, provider: string, model: string}`.
   - `available: true` только если `ANTHROPIC_API_KEY` задан в env И `GlobalSettings.aiEnabled === true`.
   - Не требует admin-прав (используется клиентом для проверки перед пре-прод онбордингом).

4. **Загрузчик промптов** `src/lib/ai/prompts.ts`:
   - `getPrompt(promptKey: string): {systemPrompt, userPromptTemplate}` — читает из коллекции AIPrompts.

5. **Seed промптов** — дополни seed-скрипт, чтобы он создавал 4 записи в AIPrompts:
   - `file_recognition` — промпт из раздела 5.3 требований.
   - `data_extraction` — промпт из раздела 5.3.
   - `recommendation_text` — промпт из раздела 7.3.
   - `audit_working_capital` — промпт из раздела 5.5.

6. **Fallback** `src/lib/ai/fallback.ts`:
   - Если AI вернул ошибку или `GlobalSettings.aiEnabled === false` → использовать шаблоны.
   - Логировать `ai.fallback`.

### Критерий готовности
- `callAI()` возвращает ответ от Claude
- Промпты загружаются из БД
- Все вызовы логируются в AIUsageLogs и EventLog
- При отключении AI (aiEnabled: false) или ошибке — используется fallback

---

## Итерация 14: Пре-прод — загрузка и AI-распознавание файлов

### Цель
Пользователь загружает свои CSV/Excel, AI распознаёт тип и извлекает данные.

### Шаги

1. **Компонент загрузки** `src/components/FileUploader.tsx` (client):
   - Drag-n-drop зона + кнопка "Выбрать файлы".
   - Ограничения: до 10 файлов, до 10 Мб суммарно, только .csv и .xlsx.
   - Показывает список загруженных файлов с прогрессом.

2. **API upload** `src/app/api/files/upload/route.ts`:
   - Принимает multipart/form-data.
   - Для каждого файла:
     a. Сохраняет в UploadedFiles с `parseStatus: 'pending'`.
     b. Читает текстовое содержимое.
     c. Логирует `file.upload`.
   - Возвращает массив ID загруженных файлов.

3. **API recognize** `src/app/api/files/[id]/recognize/route.ts`:
   - Берёт первые 50 строк файла.
   - Если `user.mode === 'demo'` → использует детерминированный парсер.
   - Если `user.mode === 'preprod'` → вызывает AI с промптом `file_recognition`.
   - Обновляет UploadedFiles: `detectedType`, `accountCode`, `period`, `parseStatus: 'recognizing'→'parsing'`.
   - Если confidence < 0.7 → `parseStatus: 'warning'`.
   - Если unknown → `parseStatus: 'error'`.
   - Логирует `file.recognized`.

4. **API parse** `src/app/api/files/[id]/parse/route.ts`:
   - Если демо → детерминированный парсер.
   - Если пре-прод → AI с промптом `data_extraction` (полный файл + recognition result).
   - Сохраняет `parsedData` в UploadedFiles.
   - `parseStatus: 'success'` или `'error'`.
   - Логирует `file.parsed` или `file.parse_error`.

5. **API analyze** `src/app/api/analysis/run/route.ts`:
   - Собирает все `parsedData` для пользователя.
   - Прогоняет `calculateMetrics()` → сохраняет AnalysisResults.
   - Прогоняет `runRulesEngine()` → создаёт Recommendations.
   - Если `user.mode === 'preprod'`:
     - Генерирует AI-тексты для каждой рекомендации (промпт `recommendation_text`).
     - Запускает AI-аудит (промпт `audit_working_capital`), создаёт карточки `AI-AUDIT`.
   - Логирует `onboarding.analysis_complete`.

6. **Таблица распознавания** `src/components/FileRecognitionTable.tsx`:
   - Показывает список файлов: имя, обнаруженный тип, счёт, период, статус.
   - Статус: спиннер при обработке, ✅ при success, ⚠️ при warning, ❌ при error.
   - Строки с warning/error — жёлтые/красные, с пояснением.

### Критерий готовности
- Загрузка 7 демо-файлов через UI работает
- AI корректно распознаёт все 7 типов
- AI извлекает данные, результат совпадает с детерминированным парсером (±5%)
- Рекомендации генерируются с AI-текстами
- AI-аудит создаёт дополнительные карточки с бейджем 🤖

---

## Итерация 15: Пре-прод — онбординг

### Цель
Онбординг для пре-прод: загрузка своих файлов → AI-анализ → результаты.

### Шаги

1. **Ветвление в OnboardingWizard** по `user.mode`:
   - `demo` → существующий флоу (итерация 7).
   - `preprod` → новый флоу (ниже).

2. **Пре-прод визард:**
   - **Перед стартом:** Проверить наличие `ANTHROPIC_API_KEY` через `GET /api/ai/status`. Если ключа нет — вместо визарда показать сообщение: "Для работы пре-прод режима необходимо настроить AI-сервис. Обратитесь к администратору." с кнопкой "Переключиться на демо-режим".
   - **Шаг 0 — Приветствие:** "Загрузите выгрузки из вашей 1С:Бухгалтерии. Мы принимаем ОСВ и другие отчёты в CSV или Excel."
   - **Шаг 1 — Загрузка файлов:** Компонент `FileUploader`. Кнопка "Начать анализ" (активна когда ≥1 файл загружен).
   - **Шаг 2 — Распознавание:** `FileRecognitionTable` с live-обновлением. Вызывает recognize → parse для каждого файла последовательно. Кнопка "Продолжить" когда все файлы обработаны.
   - **Шаг 3 — Анализ:** Progress bar с этапами: "Расчёт метрик → Проверка типовых правил → AI-аудит оборотных средств → Формирование рекомендаций". Вызывает `/api/analysis/run`.
   - **Шаг 4 — Рекомендации по учёту** (если есть СВС-1): показывает карточки СВС-1.
   - **Шаг 5 — Готово:** "Анализ завершён. Найдено N проблем." → `hasCompletedOnboarding: true` → `/app/inbox`.

3. **Сохранение данных:** В пре-прод все данные сохраняются в БД. При logout НЕ удалять (в отличие от демо).

### Критерий готовности
- Полный цикл пре-прод: загрузка файлов → распознавание → анализ → inbox с рекомендациями
- AI-карточки (🤖 AI-аудит) отображаются наряду с типизированными
- Данные сохраняются между сессиями

---

## Итерация 16: Полировка и финальное тестирование

### Цель
Кроссбраузерное и кроссплатформенное тестирование, исправление багов, финальная полировка.

### Шаги

1. **Проверь оба режима end-to-end:**
   - Демо: логин → онбординг → inbox → actions → tasks → data → logout → повтор.
   - Пре-прод: логин → онбординг с загрузкой → inbox → actions → tasks → data → logout → логин (данные на месте).

2. **Кроссплатформенное тестирование (на Vercel production URL):**

   | Платформа | Что проверить |
   |-----------|--------------|
   | **iPhone Safari** | Bottom nav, тач-таргеты, копирование в буфер, фидбэк |
   | **Android Chrome** | То же + PWA install prompt |
   | **Desktop Chrome** | Sidebar, 2-колоночная сетка карточек, таблицы на Data |
   | **Desktop Firefox** | То же — кросс-браузер |
   | **iPad** | Bottom nav, `max-w-2xl` контейнер, таблицы без горизонтального скролла |

3. **Проверь адаптивность:**
   - Сужай окно браузера от 1440px до 320px — нет горизонтального скролла на любой ширине.
   - На 1024px — sidebar появляется, bottom nav исчезает.
   - На 768px — bottom nav возвращается, контент центрируется.
   - На 375px (iPhone SE) — всё читаемо, кнопки нажимаемы.

4. **Проверь Edge cases:**
   - Загрузка невалидного файла (pdf, txt) → корректное сообщение.
   - Загрузка только 1 файла → анализ работает с неполными данными.
   - Пустой inbox → "Все рекомендации обработаны".
   - AI недоступен → fallback на шаблоны.
   - Очень длинные названия контрагентов → text-overflow, не ломают layout.

5. **Проверь логирование:**
   - Пройди оба цикла, проверь EventLog в админке.
   - AIUsageLogs — все AI-вызовы пре-прод сессии залогированы.
   - RecommendationFeedback — обратная связь сохранена.

6. **README.md:**
   - Описание проекта.
   - Как поднять локально.
   - Переменные окружения.
   - Как запустить seed.
   - Как создать первого админа.

### Критерий готовности
- Оба режима работают end-to-end на Vercel production URL
- Проверено на mobile (iPhone/Android), tablet, desktop (Chrome/Firefox)
- Sidebar на desktop, bottom nav на mobile — работают корректно
- Нет горизонтального скролла на любой ширине экрана
- Нет ошибок в консоли
- Build без warnings
- README позволяет новому разработчику поднять проект за 10 минут
- **Git:** финальный коммит `iter-16: polish & cross-device testing`

---

## v3.3.1 — Классификация бизнес-модели и адаптивный онбординг

> Эти итерации (17-23) добавляются к существующему плану реализации MMLabs (итерации 0-16). Они реализуют функциональность v3.3.1: AI-классификацию бизнеса, адаптивный онбординг с развилками, машину состояний wizard'а, и админский дашборд воронки.
>
> **Связанные документы:**
> - `requirements.md` — целевое состояние продукта (что должно работать)
> - `ARCHITECTURE.md` — техническая архитектура (как реализовано)
> - `analytics-spec.md` — детальная спецификация аналитики
> - `bizmodel_matrix_final.html` — источник матрицы 13 моделей × 7 индикаторов
>
> **Принципы:**
> - Каждая итерация ставит одну ясную цель и завершается работающим состоянием системы.
> - Между итерациями сервис всегда работоспособен (хотя бы в degraded-режиме).
> - Все новые AI-вызовы управляются флагами в `global-settings`. Дефолт: классификация **включена**, файловое AI **выключено**.
> - Не ломать обратную совместимость с v3.2: при `aiClassificationEnabled=false` система ведёт себя ровно как v3.2.

---

## Итерация 17: Миграция данных и расширение схем

### Цель

Все новые поля v3.3.1 добавлены в схему Payload. Существующие пользователи мигрированы — их `hasCompletedOnboarding` сброшен, старые `analysis-results` и `recommendations` удалены. Система запущена и работает в degraded-режиме (классификация ещё не реализована, дефолт `trading`).

### Шаги

**1. Расширь `src/collections/Users.ts`:**

```typescript
// Добавь к существующим полям:
//
// wizardState: select, options:
//   ['idle','uploading','recognizing','extracting','classifying',
//    'awaiting_confirmation','awaiting_additional_files',
//    'classification_refused','analyzing','enhancing','completed']
//   default: 'idle', required: true
//
// currentClassificationAttempts: number, default: 0, min: 0
//   admin-readonly (показывается, но не редактируется через админку)
```

**2. Расширь `src/collections/AnalysisResults.ts`:**

```typescript
// Добавь группу полей "Классификация бизнес-модели":
//
// businessModel: select, 13 опций (см. requirements §6.1):
//   ['project','trading','production','subscription','consulting','agency',
//    'project_trading','production_project','consulting_subscription',
//    'trading_agency','subscription_consulting','production_trading','clinic']
//   default: 'trading' (для безопасной деградации)
//
// businessModelConfidence: number 0-1, optional
// businessModelRationale: textarea, optional
// businessModelIndicators: json, optional
//   shape: { inventory_balance_41, wip_balance_20, finished_goods_43,
//            revenue_regularity_score, fot_share_in_cogs,
//            agency_transit_share, account_26_destination,
//            _missing: string[] }
// businessModelUserOverridden: checkbox, default false
// businessModelOriginalAi: text, optional (что AI определил до override)
//
// classificationStatus: select, options:
//   ['success', 'degraded', 'refused_manual', 'disabled']
//   default: 'disabled'
//
// requestedAdditionalAccounts: json (string[]), default []
// classificationAttempts: number, default 0
// dataQualityWarning: textarea, optional
```

**3. Расширь `src/globals/GlobalSettings.ts`:**

```typescript
// Добавь флаги классификации:
//
// aiClassificationEnabled: checkbox, default true
// classificationConfidenceThreshold: number 0-1, default 0.7
// classificationAutoConfirmThreshold: number 0-1, default 0.85
// classificationAutoConfirmEnabled: checkbox, default false
// maxClassificationAttempts: number, default 3, min 1, max 10
// supportContact: text, default '' (например "support@mmlabs.ru")
//
// requiredAccountCodes: array of text,
//   default: ['90.01','90.02','60','62','10','41','45']
// recommendedAccountCodes: array of text,
//   default: ['26','20','43','76']
// optionalAccountCodes: array of text,
//   default: ['51']
```

**4. Создай скрипт миграции `src/scripts/migrate-to-v3.3.ts`:**

```typescript
// import payload, инициализируй
// Скрипт идемпотентный — можно запускать повторно
//
// Шаги:
// 1. payload.update({collection:'users'}, {where: {role:{not_equals:'admin'}}},
//      {hasCompletedOnboarding: false, wizardState: 'idle',
//       currentClassificationAttempts: 0})
// 2. payload.delete({collection:'analysis-results'}, {where:{}})
// 3. payload.delete({collection:'recommendations'}, {where:{}})
// 4. console.log счётчики: сколько юзеров обновлено, сколько записей удалено
//
// Не трогает: invite-codes, access-requests, ai-prompts, event-log
```

**5. Создай dev-endpoint `src/app/api/dev/migrate-v3.3/route.ts`:**

```typescript
// POST: только admin
// Запускает migrate-to-v3.3.ts
// Защита: process.env.NODE_ENV !== 'production'
// Возвращает: {ok, usersReset, analysisDeleted, recsDeleted}
```

**6. Запусти миграцию вручную через CLI или через POST /api/dev/migrate-v3.3.**

### Критерий готовности

- В Payload Admin для коллекций `users`, `analysis-results`, `global-settings` видны новые поля
- Старые юзеры (созданные до v3.3.1) имеют `hasCompletedOnboarding=false`, `wizardState='idle'`
- В коллекциях `analysis-results` и `recommendations` нет старых записей
- Сервис запускается без ошибок
- Существующие тесты проходят (если есть)
- `aiClassificationEnabled=false` в `global-settings` → юзер может полностью пройти онбординг как раньше (до v3.3.1), все 9 правил применяются, дефолт businessModel = `trading`

---

## Итерация 18: Матрица бизнес-моделей и rule allowlist

### Цель

Матрица из 13 моделей × 7 индикаторов закодирована в TypeScript. Маппинг «модель → набор правил» работает. Rules engine читает businessModel из analysis-results и применяет только релевантные правила. Без AI — потому что промпт ещё не готов; пока используется дефолт `trading` со всеми 9 правилами.

### Шаги

**1. Создай `src/lib/classification/matrix.ts`:**

```typescript
// Источник правды: bizmodel_matrix_final.html
//
// export type BusinessModel =
//   'project' | 'trading' | 'production' | 'subscription' | 'consulting' | 'agency' |
//   'project_trading' | 'production_project' | 'consulting_subscription' |
//   'trading_agency' | 'subscription_consulting' | 'production_trading' | 'clinic'
//
// export type IndicatorKey =
//   'inventory_balance_41' | 'wip_balance_20' | 'finished_goods_43' |
//   'revenue_regularity_score' | 'fot_share_in_cogs' |
//   'agency_transit_share' | 'account_26_destination'
//
// export type IndicatorStrength = 'strong' | 'moderate' | 'weak' | 'contradicts'
//
// export interface ModelDefinition {
//   id: BusinessModel
//   name: string             // "Торговая"
//   nameEn: string           // "Trading"
//   category: 'base' | 'hybrid' | 'industry'
//   description: string      // короткое для UI: "Inventory-driven, B2B-дистрибуция"
//   indicators: Partial<Record<IndicatorKey, IndicatorStrength>>
//   //   например для trading:
//   //     inventory_balance_41: 'strong',
//   //     wip_balance_20: 'contradicts',  // не должно быть НЗП
//   //     fot_share_in_cogs: 'weak',  // ФОТ небольшая доля
// }
//
// export const MODELS: Record<BusinessModel, ModelDefinition> = {
//   trading: {
//     id: 'trading',
//     name: 'Торговая',
//     ...
//   },
//   // ... все 13 моделей
// }
//
// Реализуй ВСЕ 13 моделей по матрице из bizmodel_matrix_final.html
// Hint: для гибридных моделей сила сигнала = max(сила в составляющих) для
//       пересекающихся индикаторов. Например, project_trading наследует
//       inventory_balance_41=strong от trading и revenue_regularity_score=weak
//       от project.
```

**2. Создай `src/lib/classification/rule-allowlist.ts`:**

```typescript
// import { BusinessModel } from './matrix'
// import { RuleCode } from '@/lib/rules/types'  // существующий тип
//
// // Стартовая гипотеза. Пересмотрят по мере получения фидбэка.
// export const RULE_ALLOWLIST: Record<BusinessModel, Set<RuleCode>> = {
//   trading: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ЗАП-1','ЗАП-2','ПЛ-1','ФЦ-1','СВС-1']),
//   production: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ЗАП-1','ЗАП-2','ПЛ-1','ФЦ-1','СВС-1']),
//   project: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ПЛ-1','ФЦ-1','СВС-1']),  // без ЗАП
//   subscription: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ПЛ-1','ФЦ-1','СВС-1']),
//   consulting: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ПЛ-1','ФЦ-1','СВС-1']),
//   agency: new Set(['ДЗ-1','ДЗ-2','ДЗ-3','КЗ-1','ПЛ-1','ФЦ-1','СВС-1']),
//
//   // гибриды = объединение базовых
//   project_trading: new Set([... из project ∪ trading]),
//   production_project: new Set([... из production ∪ project]),
//   consulting_subscription: new Set([... из consulting ∪ subscription]),
//   trading_agency: new Set([... из trading ∪ agency]),
//   subscription_consulting: new Set([... из subscription ∪ consulting]),
//   production_trading: new Set([... из production ∪ trading]),
//
//   // отраслевой
//   clinic: new Set([... из consulting ∪ trading]),
// }
//
// export function getAllowedRules(model: BusinessModel | undefined): Set<RuleCode> {
//   if (!model) return RULE_ALLOWLIST['trading']  // safe default
//   return RULE_ALLOWLIST[model] ?? RULE_ALLOWLIST['trading']
// }
```

**3. Обнови `src/lib/rules/engine.ts`:**

```typescript
// Изменения в runRulesEngine():
//
// Было: runRulesEngine(data: ParsedAccountData[]): RuleCandidate[]
// Стало: runRulesEngine(
//   data: ParsedAccountData[],
//   allowedRules?: Set<RuleCode>
// ): RuleCandidate[]
//
// Если allowedRules передан — для каждого правила проверять
// allowedRules.has(rule.code) перед запуском. Не запускать те, которых нет.
// Если allowedRules не передан — запускать все правила (обратная совместимость).
//
// Логировать в консоль которые правила пропущены и почему:
// console.log(`[Rules] Skipped ${skippedCount} rules not in allowlist for model X`)
```

**4. Обнови `src/app/api/analysis/run/route.ts`:**

```typescript
// Перед вызовом runRulesEngine():
//
// 1. Прочитай draft analysis-results текущего юзера
//    (созданный позже на этапе классификации; пока его нет — fallback на 'trading')
// 2. const businessModel = analysisDraft?.businessModel ?? 'trading'
// 3. const allowedRules = getAllowedRules(businessModel)
// 4. const candidates = runRulesEngine(data, allowedRules)
//
// Залогируй: который businessModel применили, сколько правил всего, сколько применилось.
```

**5. Создай unit-тест `src/lib/classification/__tests__/rule-allowlist.test.ts`:**

```typescript
// Проверки:
// - getAllowedRules('trading') возвращает все 9 правил
// - getAllowedRules('project') возвращает 7 (без ЗАП-1, ЗАП-2)
// - getAllowedRules(undefined) возвращает дефолт (как trading)
// - getAllowedRules('clinic' as any) возвращает объединение consulting + trading
// - все 13 моделей перечислены в RULE_ALLOWLIST
// - все коды правил из RULE_ALLOWLIST существуют в RuleCode union
```

### Критерий готовности

- `src/lib/classification/matrix.ts` экспортирует все 13 моделей с заполненными индикаторами
- `src/lib/classification/rule-allowlist.ts` корректно мапит модель → набор правил
- `runRulesEngine` принимает опциональный `allowedRules` параметр
- Запустив анализ с `businessModel='consulting'` (выставить вручную в БД) — в результатах нет рекомендаций ЗАП-1, ЗАП-2
- Запустив анализ без businessModel — поведение идентично v3.2 (все 9 правил)
- Unit-тесты проходят

---

## Итерация 19: AI-классификация — промпт и endpoint

### Цель

AI-сервис классификации работает: получает данные ОСВ, отправляет Claude с промптом `business_model_classification` (со встроенной матрицей), валидирует ответ, обновляет analysis-results и wizardState. Endpoint `/api/analysis/classify` возвращает результат за 4-5 секунд.

### Шаги

**1. Создай AI-промпт `business_model_classification` в `src/lib/ai/prompts.ts`:**

```typescript
// Добавь в DEFAULT_PROMPTS:
//
// {
//   promptKey: 'business_model_classification',
//   name: 'Классификация бизнес-модели',
//   version: 1,
//   isActive: true,
//   systemPrompt: `Ты эксперт по бухгалтерскому учёту в России.
//   Твоя задача — определить бизнес-модель компании по выгрузкам ОСВ из 1С.
//
//   МАТРИЦА 13 МОДЕЛЕЙ:
//   ${JSON.stringify(MODELS, null, 2)}
//
//   АЛГОРИТМ:
//   1. Из ParsedAccountData рассчитай 7 индикаторов (см. список в матрице).
//      Если для индикатора нет данных — пометь как "missing".
//   2. Для каждой модели рассчитай fit score:
//      score = Σ(совпадения strong-сигналов) * 2
//            + Σ(совпадения moderate-сигналов)
//            - Σ(противоречия)
//   3. Если max score >> 2-го по величине И indicators_complete:
//      → status="success", confidence ≥ 0.7
//   4. Если разрыв маленький:
//      → status="needs_data"
//      → requestedAccounts: НЕ БОЛЕЕ 3 счетов, которые разрешат неоднозначность
//      → ВСЁ РАВНО заполни model как best-guess (это критично для UX!)
//   5. Если сигналы выглядят как гибрид но не складываются в логичную бизнес-историю:
//      → верни базовую модель (не гибрид)
//      → ОБЯЗАТЕЛЬНО заполни dataQualityWarning с пояснением учётной проблемы
//      Пример: "Перепродажа учитывается через счёт 20 как производство —
//      это похоже на ошибку учётной политики, реально это торговая модель"
//   6. Если 4+ конфликтующих сигналов или ICP не подходит (банк, гос-сектор):
//      → status="cannot_classify", model и confidence отсутствуют
//
//   КОРРЕКТИРОВКА УВЕРЕННОСТИ:
//   - На каждый missing-индикатор из 7: confidence -= 0.10
//   - Если индикаторов меньше 4: confidence ≤ 0.6
//
//   ФОРМАТ ОТВЕТА — строгий JSON:
//   {
//     "status": "success" | "needs_data" | "cannot_classify",
//     "model": "trading" | ... | null,  // 13 значений или null для cannot_classify
//     "confidence": 0.0-1.0 | null,
//     "rationale": ["bullet 1", "bullet 2", "bullet 3"],  // 2-4 пункта
//     "indicators": {
//       "inventory_balance_41": <значение или "missing">,
//       "wip_balance_20": <значение или "missing">,
//       ...
//     },
//     "requestedAccounts": ["43", "76"] | null,
//     "dataQualityWarning": "текст" | null
//   }
//
//   ВАЖНО:
//   - Только валидный JSON, без markdown-обёртки
//   - rationale — на русском, по 1-2 фразы, для CEO без бухгалтерского опыта
//   - НИКАКИХ дополнительных полей в ответе
//   `,
//   userPromptTemplate: `Данные ОСВ компании за период {{period}}:
//
//   {{parsedDataJson}}
//
//   Определи бизнес-модель и верни строгий JSON.`,
// }
```

**2. Создай TypeScript-типы в `src/lib/classification/types.ts`:**

```typescript
// import { BusinessModel, IndicatorKey } from './matrix'
//
// export type ClassificationStatus = 'success' | 'needs_data' | 'cannot_classify'
//
// export interface ClassificationIndicators {
//   inventory_balance_41?: number | 'missing'
//   wip_balance_20?: number | 'missing'
//   finished_goods_43?: number | 'missing'
//   revenue_regularity_score?: number | 'missing'  // 0-1, дисперсия выручки
//   fot_share_in_cogs?: number | 'missing'         // 0-1
//   agency_transit_share?: number | 'missing'      // 0-1
//   account_26_destination?: '90' | '20' | '44' | 'missing'
//   _missing: string[]   // список индикаторов со значением 'missing'
// }
//
// export interface ClassificationResult {
//   status: ClassificationStatus
//   model: BusinessModel | null
//   confidence: number | null
//   rationale: string[]
//   indicators: ClassificationIndicators
//   requestedAccounts: string[] | null
//   dataQualityWarning: string | null
// }
```

**3. Создай `src/lib/classification/classifier.ts`:**

```typescript
// import { callAI } from '@/lib/ai/client'
// import { ClassificationResult } from './types'
// import { ParsedAccountData } from '@/lib/parser/types'
//
// const TIMEOUT_MS = 4000
//
// export async function classify(
//   parsedData: ParsedAccountData[],
//   period: string
// ): Promise<ClassificationResult> {
//   // 1. Подготовь компактный JSON для промпта (только нужное)
//   const compactData = parsedData.map(d => ({
//     accountCode: d.accountCode,
//     openingBalance: d.openingBalance,
//     closingBalance: d.closingBalance,
//     turnoverDebit: d.turnoverDebit,
//     turnoverCredit: d.turnoverCredit,
//     entityCount: d.entities?.length ?? 0,
//     // Не отправляй сами entities — слишком много данных. Только агрегаты.
//   }))
//
//   // 2. Promise.race с timeout
//   const aiResult = await Promise.race([
//     callAI({
//       promptKey: 'business_model_classification',
//       variables: {
//         period,
//         parsedDataJson: JSON.stringify(compactData, null, 2),
//       },
//       stage: 'classification',
//     }),
//     new Promise<null>((_, reject) =>
//       setTimeout(() => reject(new Error('classification_timeout')), TIMEOUT_MS)
//     ),
//   ])
//
//   if (!aiResult?.text) {
//     // AI недоступен или timeout — возвращаем 'disabled' вариант
//     return safeFallback()
//   }
//
//   // 3. Парсинг JSON. Если AI обернул в markdown — снимаем
//   const cleaned = aiResult.text
//     .replace(/^```json\s*/i, '')
//     .replace(/\s*```$/, '')
//     .trim()
//
//   let parsed: any
//   try {
//     parsed = JSON.parse(cleaned)
//   } catch {
//     console.error('[Classify] AI returned invalid JSON', cleaned.slice(0, 500))
//     return safeFallback()
//   }
//
//   // 4. Валидация структуры (Zod schema)
//   const validated = ClassificationResultSchema.safeParse(parsed)
//   if (!validated.success) {
//     console.error('[Classify] Schema validation failed', validated.error)
//     return safeFallback()
//   }
//
//   // 5. Confidence floor: если меньше 4 индикаторов — кап на 0.6
//   const known = Object.values(validated.data.indicators)
//     .filter(v => v !== 'missing' && v !== undefined).length
//   if (known < 4 && (validated.data.confidence ?? 0) > 0.6) {
//     validated.data.confidence = 0.6
//   }
//
//   return validated.data
// }
//
// function safeFallback(): ClassificationResult {
//   return {
//     status: 'success',  // не нарушаем UX
//     model: 'trading',
//     confidence: null,
//     rationale: ['AI недоступен — применена базовая модель'],
//     indicators: { _missing: [] } as any,
//     requestedAccounts: null,
//     dataQualityWarning: null,
//   }
// }
```

**4. Создай `src/lib/classification/service.ts`:**

```typescript
// Оркестратор классификации. Используется endpoint'ом /api/analysis/classify.
//
// import payload from 'payload'
// import { classify } from './classifier'
// import { incrementCounter } from './attempts'
//
// export async function runClassification(userId: string) {
//   // 1. Прочитай настройки global-settings
//   const settings = await payload.findGlobal({slug: 'global-settings'})
//
//   // 2. Если aiClassificationEnabled=false — сразу 'trading' с status='disabled'
//   if (!settings.aiClassificationEnabled) {
//     return await persistClassification(userId, {
//       status: 'success',
//       model: 'trading',
//       confidence: null,
//       rationale: ['Классификация отключена администратором'],
//       indicators: {} as any,
//       requestedAccounts: null,
//       dataQualityWarning: null,
//     }, 'disabled')
//   }
//
//   // 3. Загрузи parsedData всех файлов юзера со status='success'
//   const files = await payload.find({
//     collection: 'uploaded-files',
//     where: { owner: {equals: userId}, parseStatus: {equals: 'success'} }
//   })
//
//   const parsedData = files.docs
//     .map(f => f.parsedData?.parsed ?? f.parsedData?.aiParsed)
//     .filter(Boolean)
//
//   // 4. Запусти AI-классификацию
//   const result = await classify(parsedData, currentPeriod())
//
//   // 5. Определи финальный classificationStatus
//   const finalStatus =
//     result.status === 'cannot_classify' ? 'refused_manual' :  // временно, юзер выберет
//     result.status === 'success' && (result.confidence ?? 0) >= settings.classificationConfidenceThreshold
//       ? 'success'
//       : 'success'  // needs_data тоже сохраняется как success по факту, статус determines UI
//
//   // 6. Запиши/обнови analysis-results (draft) + увеличь attempts счётчик
//   const persisted = await persistClassification(userId, result, finalStatus)
//
//   // 7. Обнови users.wizardState
//   const nextWizardState =
//     result.status === 'cannot_classify' ? 'classification_refused' : 'awaiting_confirmation'
//
//   await payload.update({
//     collection: 'users',
//     id: userId,
//     data: { wizardState: nextWizardState }
//   })
//
//   // 8. Лог события classification.completed (см. итерацию 22)
//
//   return { ...result, attempt: persisted.classificationAttempts }
// }
```

**5. Создай endpoint `src/app/api/analysis/classify/route.ts`:**

```typescript
// POST: Cookie auth required
//
// Body: пустое
//
// Логика:
// 1. const user = await getCurrentUser(req)
// 2. Проверь wizardState: должен быть в {uploading,recognizing,extracting,classifying,
//    awaiting_additional_files} — иначе 409 Conflict
// 3. Проверь maxClassificationAttempts: если currentClassificationAttempts >= max —
//    вернуть 429 (юзер должен либо сделать override, либо принять degraded)
// 4. Обнови users.wizardState = 'classifying'
// 5. const result = await runClassification(user.id)
// 6. await updateFunnelEvent(user.id, {
//      reachedClassification: true,
//      classificationStartedAt: new Date(),
//      classificationCompletedAt: new Date(),
//      classificationAttempts: <inc>
//    })  // см. итерацию 22
// 7. Возврат: { ...result, wizardState: <новый> }
//
// Защита от долгих вызовов: общий timeout 8 c (4 c на AI + buffer на DB)
```

**6. Расширь endpoint `/api/analysis/run`:**

```typescript
// Перед запуском rules engine — проверь, что businessModel установлен в analysis-results.
// Если нет — это значит классификация ещё не выполнялась. Запусти runClassification()
// синхронно (как fallback для случая когда юзер не пошёл через UI).
//
// Альтернатива: возвращать 412 Precondition Failed и требовать сначала вызвать /classify.
// Выбор: pragmatic — fallback. Не ломает legacy-вызовы из тестов.
```

### Критерий готовности

- В Payload Admin виден промпт `business_model_classification` (после `POST /api/ai/seed-prompts?upsert=true`)
- POST /api/analysis/classify (на тестовых данных от torgovaya компании) возвращает status='success', model='trading', confidence > 0.7 за < 5 сек
- POST /api/analysis/classify на синтетически испорченных данных (только 90.01 без других счетов) возвращает status='needs_data' с requestedAccounts
- При aiClassificationEnabled=false → возвращается model='trading', classificationStatus='disabled' без вызова AI
- В коллекции analysis-results после вызова — все 10 новых полей классификации заполнены
- В users.wizardState изменилось состояние
- Все вызовы AI логируются в ai-usage-logs

---

## Итерация 20: UI экраны классификации

### Цель

Все 5 новых UI-экранов (подтверждение, развилка, degraded, отказ, возврат) реализованы и стилизованы под дизайн-систему. Endpoint `PATCH /api/analysis/classification` принимает решения юзера и обновляет состояние.

### Шаги

**1. Создай endpoint `src/app/api/analysis/classification/route.ts` (PATCH):**

```typescript
// Body: { model: BusinessModel, isOverride: bool, acceptDegraded: bool,
//         choice?: 'upload_now' | 'upload_later' | 'continue_degraded' }
//
// Логика:
// 1. user = getCurrentUser(req)
// 2. wizardState должен быть 'awaiting_confirmation' или 'classification_refused' — иначе 409
// 3. Найди draft analysis-results юзера
// 4. Если choice === 'upload_later':
//    → wizardState = 'awaiting_additional_files'
//    → не трогаем businessModel
//    → updateFunnelEvent: pauseCount++, last forkChoice='upload_later'
//    → 200 { ok, status: 'paused', nextStage: '/app/onboarding/resume' }
//
// 5. Если choice === 'upload_now':
//    → wizardState = 'uploading' (юзер сейчас вернётся в загрузку)
//    → updateFunnelEvent: forkChoice='upload_now'
//    → 200 { ok, status: 'reupload', nextStage: '/app/onboarding' }
//
// 6. Иначе (choice === 'continue_degraded' или просто confirm):
//    → analysis-results.businessModel = model
//    → analysis-results.businessModelUserOverridden = isOverride
//    → analysis-results.classificationStatus =
//          acceptDegraded ? 'degraded' :
//          (предыдущий status === 'classification_refused') ? 'refused_manual' :
//          'success'
//    → wizardState = 'analyzing'
//    → updateFunnelEvent: confirmationCompletedAt, finalModel, finalConfidence
//    → 200 { ok, status: 'confirmed', nextStage: '/app/onboarding' }
//
// При isOverride=true — лог события classification.user_override
// При acceptDegraded=true — лог события classification.degraded_accepted
```

**2. Создай endpoint `src/app/api/analysis/classification-state/route.ts` (GET):**

```typescript
// GET: Cookie auth
//
// Возвращает текущее состояние draft analysis-results + wizard:
// {
//   wizardState: <user.wizardState>,
//   classification: {
//     status: <derived>,  // success/needs_data/cannot_classify
//     model: <businessModel>,
//     confidence: <businessModelConfidence>,
//     rationale: <businessModelRationale parsed as array>,
//     indicators: <businessModelIndicators>,
//     requestedAccounts: <requestedAdditionalAccounts>,
//     dataQualityWarning: <dataQualityWarning>,
//     attempt: <classificationAttempts>,
//     maxAttempts: <global-settings.maxClassificationAttempts>,
//   }
// }
//
// Используется UI для polling и для re-render после reload страницы.
```

**3. Создай endpoint `src/app/api/analysis/refuse-classification/route.ts` (POST):**

```typescript
// POST: Cookie auth
// Body: { reason: 'contact_support' }
//
// Логика:
// 1. wizardState должен быть 'classification_refused' — иначе 409
// 2. Лог события classification.refused_contact_requested
// 3. wizardState не меняется (юзер остаётся в refused, но мы знаем намерение)
// 4. updateFunnelEvent: outcome = 'refused'
// 5. Возврат: { ok, supportContact: <global-settings.supportContact> }
```

**4. Создай React-компонент `src/components/onboarding/ClassificationConfirm.tsx`:**

```tsx
// Экран 5.4 из requirements.md
//
// Props: { state: ClassificationState, onConfirm, onChangeModel }
//
// Структура:
// - Заголовок «Тип вашего бизнеса»
// - Большой блок с название модели + описание (из MODELS[model].name + .description)
// - Confidence bar (визуально процентами)
// - Раскрываемый блок «Почему мы так решили» — bullet list из rationale
// - Раскрываемый блок «Изменить тип бизнеса» — Select с 13 опциями
// - Если dataQualityWarning — жёлтый блок предупреждения
// - Кнопка «Подтвердить и продолжить»
//
// Поведение:
// - Если confidence ≥ classificationAutoConfirmThreshold И auto-confirm enabled:
//   countdown 3 секунды, затем автоматический onConfirm()
//   Юзер может прервать кликом
// - При выборе другой модели в Select: isOverride = true, кнопка «Подтвердить» включается
// - Не показывает счётчик attempts (юзеру не нужно)
//
// Стили: Card-like, основной шрифт Inter, цвета из design tokens.
// Mobile/Desktop responsive по правилам requirements §5.14
```

**5. Создай `src/components/onboarding/ClassificationFork.tsx`:**

```tsx
// Экран 5.5 — развилка с 3 вариантами
//
// Props: { state: ClassificationState, onChoose: (choice) => void }
//
// Структура:
// - Заголовок «Чтобы точнее определить тип вашего бизнеса»
// - Текст с best-guess: «Похоже на [model] (или пересечение X и Y)»
// - Список «Что бы помогло»:
//   для каждого account из requestedAccounts:
//     иконка + «ОСВ по счёту X»
//     краткое объяснение почему важен этот счёт (брать из map ACCOUNT_HINTS)
// - Radio group из 3 вариантов:
//   ◯ Загрузить сейчас
//   ◯ Загружу позже (анализ возобновится при возврате)
//   ◯ Продолжить без этих файлов (с понижением точности)
//
// - Кнопка «Продолжить»
//
// При attempt >= maxAttempts:
//   Первые 2 варианта disabled, есть только "Продолжить без этих файлов"
//   + объяснение «Достигнут лимит попыток уточнения»
//
// При клике «Продолжить» — PATCH /api/analysis/classification с choice
// Затем navigate согласно nextStage из ответа
```

**6. Создай `src/components/onboarding/ClassificationDegraded.tsx`:**

```tsx
// Экран 5.6 — degraded подтверждение
//
// По сути это ClassificationConfirm + жёлтая плашка вверху +
// дополнительная кнопка «Загрузить рекомендованные счета сейчас»
// (которая ведёт обратно в Fork с теми же requestedAccounts).
//
// Юзер видит этот экран только при flow «развилка → continue_degraded».
```

**7. Создай `src/components/onboarding/ClassificationRefused.tsx`:**

```tsx
// Экран 5.7 — отказ от классификации
//
// Структура:
// - Заголовок «Не удалось определить тип вашего бизнеса»
// - Объяснение
// - Section «Что можно сделать»:
//   - Кнопка «Связаться с консультантом»
//     → POST /api/analysis/refuse-classification → открывает supportContact
//   - Section «Выбрать тип бизнеса вручную»:
//     - Select из 13 опций
//     - Кнопка «Продолжить с выбранной моделью»
//       → PATCH /api/analysis/classification с isOverride=true
```

**8. Создай `src/components/onboarding/ClassificationResume.tsx`:**

```tsx
// Экран 5.8 — возврат после паузы. По сути ClassificationFork с приветствием.
//
// Props: { state: ClassificationState }
//
// Структура:
// - «Продолжим с того места, где остановились»
// - Резюме: «Мы определили вашу модель как [X] с уверенностью Y%»
// - Тот же UI что в Fork (file picker для requestedAccounts)
// - Кнопка «Принять текущее предположение и продолжить анализ»
//   → PATCH /api/analysis/classification с choice='continue_degraded'
//
// При первом рендере — лог события wizard.resumed с
// hoursAway = (now - <wizardPausedAt>).hours
```

**9. Подготовь константу `ACCOUNT_HINTS` в `src/lib/classification/account-hints.ts`:**

```typescript
// Карта «код счёта → подсказка для юзера, что этот счёт показывает»
// Используется в ClassificationFork
//
// export const ACCOUNT_HINTS: Record<string, string> = {
//   '26': 'Покажет распределение управленческих расходов',
//   '20': 'Поможет понять, есть ли производственный учёт',
//   '43': 'Покажет, есть ли у вас собственное производство',
//   '76': 'Поможет отличить агентскую схему от обычной',
//   '51': 'Расчётный счёт (для будущего анализа ликвидности)',
// }
```

### Критерий готовности

- Все 5 экранов рендерятся корректно на mobile и desktop
- При status='success' и confidence≥auto-threshold (если включено) — countdown работает, юзер может прервать
- При status='needs_data' — Fork показывается, 3 варианта функциональны
- При status='cannot_classify' — Refused показывается, ручной выбор работает
- При выборе 'upload_later' → wizard переходит в awaiting_additional_files, юзер может выйти из приложения и вернуться → попадает на ClassificationResume
- В analysis-results после действий юзера businessModel/classificationStatus/userOverridden корректно отражают выбор
- Юзер с overridden моделью видит свой выбор после reload страницы

---

## Итерация 21: Wizard state machine — routing layout

### Цель

Layout `/app/*` корректно маршрутизирует юзера в зависимости от `users.wizardState`. Юзер не может «застрять» в неконсистентном состоянии — любая комбинация state + URL приводит к корректному экрану. Polling статуса работает.

### Шаги

**1. Обнови `src/app/(frontend)/app/layout.tsx`:**

```typescript
// Server Component, выполняется на каждом запросе к /app/*
//
// Логика:
// 1. user = getCurrentUser()
// 2. Если !user — redirect('/auth/login')
// 3. Если user.role === 'admin' — пропускать без проверок (admin видит всё)
// 4. По user.wizardState и текущему pathname сделай redirect, если нужно:
//
//    state === 'idle' && hasCompletedOnboarding === false:
//       allowed: /app, /app/onboarding/*
//       redirect: всё остальное → /app
//
//    state ∈ {uploading, recognizing, extracting, classifying,
//             awaiting_confirmation, analyzing, enhancing}:
//       allowed: /app/onboarding/*
//       redirect: всё остальное → /app/onboarding
//
//    state === 'awaiting_additional_files':
//       allowed: /app/onboarding/resume
//       redirect: всё остальное → /app/onboarding/resume
//
//    state === 'classification_refused':
//       allowed: /app/onboarding/refused
//       redirect: всё остальное → /app/onboarding/refused
//
//    state === 'completed':
//       allowed: /app/inbox, /app/tasks, /app/data, /app/upgrade
//       redirect: /app/onboarding/* → /app/inbox
//
// 5. Рендер children
//
// Хук useEffect или Server Action использовать НЕЛЬЗЯ — это серверный layout.
// Используется server-side redirect через next/navigation.
```

**2. Создай `src/app/(frontend)/app/onboarding/page.tsx`:**

```tsx
// Универсальный wizard-экран. Внутри — Client Component, который
// мониторит wizardState и подменяет UI.
//
// 'use client'
//
// useEffect → poll /api/analysis/status каждые 2 сек (когда wizardState
//   в активном AI-состоянии: recognizing, extracting, classifying,
//   analyzing, enhancing).
//
// useEffect → poll /api/analysis/classification-state каждые 2 сек
//   (когда wizardState в awaiting_confirmation).
//
// Switch по wizardState:
//   uploading → <FileUploader />
//   recognizing | extracting → <AiProcessProgress stage='files' />
//   classifying → <AiProcessProgress stage='classification' />
//   awaiting_confirmation:
//     classification.status === 'success' → <ClassificationConfirm />
//     classification.status === 'needs_data' → <ClassificationFork />
//     classification.status === 'success' && classificationStatus === 'degraded'
//       → <ClassificationDegraded />
//   analyzing → <AiProcessProgress stage='rules' />
//   enhancing → <AiProcessProgress stage='enhancing' />
```

**3. Создай `src/app/(frontend)/app/onboarding/resume/page.tsx`:**

```tsx
// Wraps <ClassificationResume />. Получает ClassificationState через
// /api/analysis/classification-state на server-side. На клиенте — обновляется
// после действий юзера.
```

**4. Создай `src/app/(frontend)/app/onboarding/refused/page.tsx`:**

```tsx
// Wraps <ClassificationRefused />. Тот же подход.
```

**5. Обнови `src/components/onboarding/AiProcessProgress.tsx` (был в v3.2):**

```tsx
// Расширь Stage union новым значением 'classification':
//
// type Stage = 'files' | 'classification' | 'rules' | 'enhancing'
//
// Для stage='classification': показывает «Определяем тип вашего бизнеса»
// (анимированный indicator, без счётчика — это короткая 5-секундная стадия)
```

**6. Обнови `/api/analysis/status` (расширь):**

```typescript
// Добавь в response:
//
// {
//   ...existing fields,
//   wizardState: user.wizardState,
//   classification?: { ... shape from /classification-state ... }
//     // включается только если wizardState ∈ {classifying, awaiting_confirmation}
// }
//
// Это позволяет UI получать всю нужную информацию одним polling-вызовом.
```

**7. Защита от race conditions:**

```typescript
// В каждом endpoint, который меняет wizardState:
// - Проверяй текущий state перед изменением
// - Возвращай 409 Conflict если неправильное состояние
// - Это защита от двойных кликов и rapid-fire запросов из UI
//
// Пример: /api/analysis/classify проверяет wizardState ∈
//   {uploading, recognizing, extracting, classifying, awaiting_additional_files}
// Если юзер уже в awaiting_confirmation — 409.
```

**8. Тестовый сценарий:**

```typescript
// Создай файл src/__tests__/wizard-flow.test.ts с e2e-тестом:
//
// 1. Юзер регистрируется → wizardState='idle'
// 2. Загружает 7 обязательных файлов → wizardState='uploading' → 'classifying'
// 3. AI-classify возвращает success → wizardState='awaiting_confirmation'
// 4. Юзер подтверждает → wizardState='analyzing'
// 5. /api/analysis/run отрабатывает → wizardState='enhancing' → 'completed'
// 6. Финал: hasCompletedOnboarding=true, видит /app/inbox
//
// Второй сценарий (fork):
// 1-2. То же
// 3. AI-classify возвращает needs_data → wizardState='awaiting_confirmation'
// 4. Юзер выбирает 'upload_later' → wizardState='awaiting_additional_files'
// 5. Юзер выходит из браузера, возвращается → попадает на /onboarding/resume
// 6. Юзер выбирает 'continue_degraded' → wizardState='analyzing'
// 7. Финал тот же
```

### Критерий готовности

- Юзер не может попасть на `/app/inbox` при `wizardState !== 'completed'` — layout редиректит
- Юзер не может попасть на `/app/onboarding` при `wizardState === 'completed'` — layout редиректит на /app/inbox
- При reload страницы во время онбординга — попадает на правильный экран в зависимости от wizardState
- Polling /api/analysis/status корректно обновляет UI при смене wizardState
- 409 Conflict возвращается при попытке вызвать endpoint из неправильного состояния
- Сценарий fork → upload_later → выход → возврат → resume работает end-to-end

---

## Итерация 22: OnboardingFunnelEvents — сбор данных воронки

### Цель

Каждый онбординг создаёт запись в `onboarding-funnel-events`, обновляется по мере прохождения шагов. Helper `updateFunnelEvent` идемпотентный. Cron-задача отлавливает abandoned-онбординги. Все новые eventTypes пишутся в event-log.

### Шаги

**1. Создай коллекцию `src/collections/OnboardingFunnelEvents.ts`:**

```typescript
// Полная схема — в analytics-spec.md §3.2
//
// Slug: 'onboarding-funnel-events'
//
// Fields (все опциональные кроме owner и attemptNumber):
//   - owner: relationship → users (required, indexed)
//   - attemptNumber: number, default 1, required
//
//   Step flags (booleans, default false):
//   reachedStart, reachedUpload, reachedMinimumSet, reachedRecommendedSet,
//   reachedRecognition, reachedExtraction, reachedClassification,
//   reachedConfirmation, reachedAnalysis
//
//   Timestamps (date, optional):
//   startedAt, uploadStartedAt, minimumSetCompletedAt, recommendedSetCompletedAt,
//   classificationStartedAt, classificationCompletedAt, confirmationCompletedAt,
//   analysisCompletedAt, abandonedAt
//
//   Durations (number/ms, optional, fills at finalization):
//   durationToUpload, durationUpload, durationRecognition, durationExtraction,
//   durationClassification, durationConfirmation, durationAnalysis, durationTotal
//
//   Files & accounts:
//   filesUploaded: number, default 0
//   uploadedAccounts: json (array of strings), default []
//   missingRequiredAccounts: json, default []
//   missingRecommendedAccounts: json, default []
//
//   Classification:
//   classificationAttempts: number, default 0
//   classificationFinalStatus: select [success | degraded | refused_manual | disabled], optional
//   initialAiModel, initialAiConfidence
//   finalModel, finalConfidence
//   userOverridden: bool, default false
//   hasDataQualityWarning: bool, default false
//   requestedAccountsHistory: json (string[][])
//
//   Fork choices:
//   forkChoices: json — array of {attempt, choice, timestamp}
//   pauseCount: number, default 0
//   totalPauseDurationMs: number, default 0
//
//   Final:
//   outcome: select [completed | abandoned | refused | in_progress], default in_progress
//   recommendationsCreated: number, default 0
//
// Access:
//   read: admin only
//   create/update: server-side only (через payload.create/update в helper'е)
//   delete: запрещено (даже для admin — это аналитический архив)
//
// Indexes:
//   - { owner: 1, attemptNumber: 1 } (для поиска текущей записи юзера)
//   - { outcome: 1, updatedAt: 1 } (для cron sweep)
//   - { startedAt: -1 } (для дашборда)
```

**2. Создай helper `src/lib/funnel/update-event.ts`:**

```typescript
// import payload from 'payload'
//
// /**
//  * Идемпотентно обновляет funnel-запись текущего онбординга юзера.
//  * Если записи нет — создаёт. Boolean-флаги достижения шагов
//  * выставляются только при первом наблюдении (не сбрасываются обратно).
//  */
// export async function updateFunnelEvent(
//   userId: string,
//   patch: Partial<OnboardingFunnelEvent>
// ): Promise<void> {
//   try {
//     // 1. Найди текущую in_progress запись юзера
//     const existing = await payload.find({
//       collection: 'onboarding-funnel-events',
//       where: { owner: {equals: userId}, outcome: {equals: 'in_progress'} },
//       limit: 1,
//     })
//
//     if (existing.docs.length === 0) {
//       // 2. Создание: определи attemptNumber
//       const allAttempts = await payload.count({
//         collection: 'onboarding-funnel-events',
//         where: { owner: {equals: userId} }
//       })
//       const attemptNumber = (allAttempts.totalDocs ?? 0) + 1
//
//       await payload.create({
//         collection: 'onboarding-funnel-events',
//         data: {
//           owner: userId,
//           attemptNumber,
//           outcome: 'in_progress',
//           startedAt: new Date(),
//           ...patch,
//         },
//       })
//       return
//     }
//
//     // 3. Обновление существующей. Применяем idempotency правила:
//     //    - reachedXxx и xxxAt: не перезаписывать если уже true/set
//     //    - Counters (incl. pauseCount, classificationAttempts): использовать $inc
//     //    - forkChoices, requestedAccountsHistory: append
//     //    - Остальное: replace
//
//     const current = existing.docs[0]
//     const merged = mergePatch(current, patch)  // helper, см. ниже
//
//     await payload.update({
//       collection: 'onboarding-funnel-events',
//       id: current.id,
//       data: merged,
//     })
//   } catch (e) {
//     // Никогда не ломаем основной flow из-за logging-ошибок
//     console.error('[funnel] updateFunnelEvent failed:', e)
//   }
// }
//
// function mergePatch(current, patch) {
//   const merged = {...patch}
//   // Idempotent flags: keep true once set
//   for (const flag of REACHED_FLAGS) {
//     if (current[flag] === true) merged[flag] = true
//   }
//   // Idempotent timestamps: keep first observation
//   for (const ts of TIMESTAMP_FIELDS) {
//     if (current[ts] && !patch[ts]) merged[ts] = current[ts]
//     else if (current[ts] && patch[ts]) merged[ts] = current[ts]  // keep first
//   }
//   // Append-only arrays
//   if (patch.forkChoices) {
//     merged.forkChoices = [...(current.forkChoices ?? []), ...patch.forkChoices]
//   }
//   if (patch.requestedAccountsHistory) {
//     merged.requestedAccountsHistory = [
//       ...(current.requestedAccountsHistory ?? []),
//       ...patch.requestedAccountsHistory,
//     ]
//   }
//   return merged
// }
```

**3. Создай `src/lib/funnel/compute-durations.ts`:**

```typescript
// Вычисляет все durationXxx поля при финализации онбординга.
//
// export function computeDurations(record: OnboardingFunnelEvent) {
//   const d = (later: Date | null, earlier: Date | null): number | null =>
//     later && earlier ? later.getTime() - earlier.getTime() : null
//
//   return {
//     durationToUpload: d(record.uploadStartedAt, record.startedAt),
//     durationUpload: d(record.minimumSetCompletedAt, record.uploadStartedAt),
//     durationRecognition: d(...),  // нужны recognitionCompletedAt — возможно не отслеживаем точно
//     durationExtraction: d(...),
//     durationClassification: d(record.classificationCompletedAt, record.classificationStartedAt),
//     durationConfirmation: d(record.confirmationCompletedAt, record.classificationCompletedAt),
//     durationAnalysis: d(record.analysisCompletedAt, record.confirmationCompletedAt),
//     durationTotal: d(record.analysisCompletedAt, record.startedAt),
//   }
// }
```

**4. Создай cron-задачу `src/lib/funnel/abandoned-sweep.ts`:**

```typescript
// Запускается раз в час.
//
// export async function sweepAbandoned() {
//   const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)  // 24 часа назад
//
//   const stale = await payload.find({
//     collection: 'onboarding-funnel-events',
//     where: { outcome: {equals: 'in_progress'}, updatedAt: {less_than: cutoff} },
//   })
//
//   for (const record of stale.docs) {
//     await payload.update({
//       collection: 'onboarding-funnel-events',
//       id: record.id,
//       data: { outcome: 'abandoned', abandonedAt: new Date() },
//     })
//
//     // Лог в event-log
//     await logEvent({
//       owner: record.owner,
//       eventType: 'wizard.abandoned',
//       payload: {
//         lastState: <derive from data>,
//         hoursIdle: (Date.now() - record.updatedAt.getTime()) / 3600000,
//       },
//     })
//   }
//
//   console.log(`[funnel] swept ${stale.docs.length} abandoned onboardings`)
// }
//
// Запуск:
//   - dev: вручную или через простой setInterval (не для prod!)
//   - prod: Vercel scheduled function (vercel.json:
//     { "crons": [{"path": "/api/cron/sweep-abandoned", "schedule": "0 * * * *"}] }
//   - Endpoint /api/cron/sweep-abandoned проверяет Authorization header
//     с CRON_SECRET и вызывает sweepAbandoned()
```

**5. Интегрируй вызовы `updateFunnelEvent` во все ключевые точки:**

```typescript
// Список endpoints где вызвать updateFunnelEvent (с примерами patch'ей):
//
// /api/auth/register (после успешной регистрации):
//   updateFunnelEvent(userId, { reachedStart: true, startedAt: new Date() })
//
// (frontend) /app — Server Component, при первом визите:
//   if (!user.hasCompletedOnboarding) updateFunnelEvent(userId, { reachedStart: true })
//
// /api/files/upload (для каждого загруженного файла):
//   updateFunnelEvent(userId, {
//     reachedUpload: true, uploadStartedAt: new Date(),
//     filesUploaded: <inc>, uploadedAccounts: [...accounts],
//   })
//   // После успеха — проверь, набрался ли минимальный набор:
//   if (allRequiredUploaded) {
//     updateFunnelEvent(userId, {
//       reachedMinimumSet: true, minimumSetCompletedAt: new Date()
//     })
//   }
//
// /api/files/ai-recognize-batch (start/end):
//   reachedRecognition: true
//
// /api/files/ai-extract-next (end):
//   reachedExtraction: true
//
// /api/analysis/classify (start):
//   reachedClassification: true, classificationStartedAt
// /api/analysis/classify (end):
//   classificationCompletedAt, classificationAttempts: <inc>,
//   initialAiModel (если первая попытка),
//   requestedAccountsHistory: [[<новые accounts>]],
//   hasDataQualityWarning: <bool>
//
// /api/analysis/classification (PATCH, при confirm):
//   reachedConfirmation: true, confirmationCompletedAt,
//   finalModel, finalConfidence, userOverridden, classificationFinalStatus
//
// /api/analysis/classification (при upload_later):
//   pauseCount: <inc>, forkChoices: [<new choice>]
//
// /api/analysis/classification (при upload_now / continue_degraded):
//   forkChoices: [<new choice>]
//
// /api/analysis/run (после генерации recommendations):
//   reachedAnalysis: true, analysisCompletedAt,
//   recommendationsCreated: <count>,
//   outcome: 'completed', durationXxx: <computed>
//
// /api/analysis/refuse-classification:
//   outcome: 'refused'
```

**6. Расширь existing event-log с новыми eventTypes (см. analytics-spec.md §2):**

```typescript
// В src/lib/logger.ts расширь whitelist eventType
// (если есть проверка на whitelisted events).
//
// Все новые eventTypes из analytics-spec §2.2-2.5 должны быть приняты:
//   onboarding.minimum_set_complete, classification.started,
//   classification.completed, classification.confirmed, classification.user_override,
//   classification.additional_data_requested, classification.user_choice,
//   classification.degraded_accepted, classification.refused_manual_override,
//   classification.refused_contact_requested,
//   wizard.state_changed, wizard.paused, wizard.resumed, wizard.abandoned,
//   file.recognition_started, file.recognition_completed,
//   file.extraction_started, file.extraction_completed, file.parse_error,
//   ai.fallback,
//   recommendation.due_date_changed, task.overdue
//
// Все логируются вместе с обновлением funnel-event (двойная запись:
// одна для аудита/отладки, одна для дашборда).
```

### Критерий готовности

- При прохождении полного онбординга в `onboarding-funnel-events` создана 1 запись
- В этой записи все 9 reachedXxx флагов = true, все timestamps заполнены, durationXxx вычислены
- При прохождении онбординга с pause + resume — pauseCount = 1, totalPauseDurationMs > 0
- При выборе upload_later и НЕ возврате за 24 часа — cron sweep отметил outcome='abandoned'
- В event-log пишется 30+ типов событий, ничего не теряется
- Удаление записи из onboarding-funnel-events запрещено даже для admin (Payload access deny)

---

## Итерация 23: Admin funnel dashboard

### Цель

В Payload Admin UI на маршруте `/admin/funnel` отображается дашборд воронки онбординга с шестью блоками. API endpoints возвращают агрегированные данные. Доступ только для admin.

### Шаги

**1. Создай endpoint `src/app/api/admin/funnel/overview/route.ts`:**

```typescript
// GET: только admin
//
// Query params: period (today|7d|30d|custom), date_from, date_to,
//   mode, classificationStatus, completedOnly
//
// Логика:
// 1. user = getCurrentUser(); if user.role !== 'admin' → 403
// 2. Построй MongoDB aggregation pipeline на onboarding-funnel-events
// 3. Возврат — JSON со всеми 6 блоками (см. analytics-spec.md §5.1):
//    {
//      funnelSteps: [...],     // блок 1
//      forkAnalysis: {...},    // блок 2
//      models: [...],          // блок 3
//      overridePairs: [...],   // блок 4
//      durations: {...},       // блок 5
//      cohorts: [...],         // блок 6
//    }
//
// Используй MongoDB $group, $sortByCount, $bucket, $facet для эффективного
// одного запроса (а не 6 отдельных).
//
// Кэшируй ответ на 60 секунд (in-memory или Vercel KV).
```

**2. Создай endpoint `src/app/api/admin/funnel/users/route.ts`:**

```typescript
// GET: только admin
//
// Query params: step (имя из funnel шага), completed (true|false),
//   period, mode
//
// Возвращает список юзеров, дропнувшихся на конкретном шаге.
//
// Например step=upload_started, completed=false:
// → юзеры у которых reachedUpload=true но reachedMinimumSet=false
//
// Возврат: [{ userId, email, lastState, lastActivityAt, missingAccounts, ...}]
//
// Limit 100 записей по умолчанию (можно расширить через ?limit).
```

**3. Создай endpoint `src/app/api/admin/funnel/export/route.ts`:**

```typescript
// GET: только admin
//
// Query params: period, mode, classificationStatus
//
// Возврат: CSV stream (Content-Type: text/csv; charset=utf-8)
//
// Колонки: все плоские поля onboarding-funnel-events
// (json-поля forkChoices, requestedAccountsHistory сериализуются как JSON-строки)
//
// Использование Node Streams для эффективности на больших датасетах.
// Header: Content-Disposition: attachment; filename="funnel-{period}.csv"
```

**4. Создай custom Admin page `/admin/funnel`:**

```typescript
// В Payload Admin UI добавляется через admin.components.views в payload.config.ts:
//
// admin: {
//   components: {
//     views: {
//       FunnelDashboard: {
//         path: '/funnel',
//         Component: '@/components/admin/FunnelDashboard'
//       }
//     }
//   }
// }
//
// И в admin.components.beforeNavLinks добавь ссылку на /admin/funnel
```

**5. Создай `src/components/admin/FunnelDashboard.tsx`:**

```tsx
// Большой Client Component с UI дашборда.
//
// Структура:
// 1. Header с глобальными фильтрами (period selector, mode dropdown,
//    classification status, completed-only toggle)
// 2. 6 блоков (см. analytics-spec.md §4):
//    - Block 1: <FunnelChart steps={data.funnelSteps} />
//    - Block 2: <ForkAnalysisCards data={data.forkAnalysis} />
//    - Block 3: <ModelDistribution models={data.models} />
//    - Block 4: <OverridePairsTable pairs={data.overridePairs} />
//    - Block 5: <DurationsTable durations={data.durations} />
//    - Block 6: <CohortRetention cohorts={data.cohorts} />
// 3. Кнопка экспорта CSV (right-top corner)
//
// Использует:
// - Recharts для графиков (BarChart, AreaChart, FunnelChart)
// - Tailwind/shadcn UI для cards и tables
// - SWR для кэширования запросов (revalidateOnFocus: false)
//
// При клике на любую цифру в funnel — открывается modal со списком юзеров
// (загружается из /api/admin/funnel/users)
```

**6. Создай вспомогательные компоненты в `src/components/admin/funnel/`:**

```tsx
// FunnelChart.tsx        — горизонтальная воронка с числами и %
// ForkAnalysisCards.tsx  — карточки с распределением выборов
// ModelDistribution.tsx  — bar chart 13 моделей + таблица деталей
// OverridePairsTable.tsx — топ-5 пар «AI определил X → юзер исправил на Y»
// DurationsTable.tsx     — таблица p50/p95/p99
// CohortRetention.tsx    — таблица когорт + разрез по classificationStatus
// FilterBar.tsx          — общие фильтры
// UserDropoutModal.tsx   — drill-down модал
```

**7. Регистрация cron-задачи `/api/cron/sweep-abandoned`:**

```typescript
// src/app/api/cron/sweep-abandoned/route.ts
//
// GET (Vercel scheduled function):
// 1. Проверь Authorization header === `Bearer ${process.env.CRON_SECRET}`
//    Иначе 401
// 2. Вызови sweepAbandoned()
// 3. Возврат: {ok, sweptCount}
//
// vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/sweep-abandoned",
//     "schedule": "0 * * * *"
//   }]
// }
```

### Критерий готовности

- На `/admin/funnel` (только для admin) рендерится дашборд из 6 блоков
- Глобальные фильтры работают: смена периода обновляет все блоки
- Клик по цифре в Block 1 открывает модал со списком юзеров
- Кнопка «Экспорт CSV» скачивает плоский файл со всеми funnel-event записями
- Cron-задача sweep-abandoned работает (можно проверить через ручной вызов с CRON_SECRET)
- Дашборд для пустой БД отображается без ошибок (показывает «Нет данных за период»)
- Время рендера дашборда < 2 секунд при ~1000 юзерах в БД (благодаря MongoDB $facet)

---

## Финальная проверка v3.3.1

После прохождения всех итераций (17-23) убедись:

**End-to-end сценарии:**

1. **Happy path: торговая компания**
   - Регистрация → загрузка 7 обязательных + 4 рекомендуемых файлов
   - AI-classify возвращает success, model='trading', confidence=0.85
   - Auto-confirm включён → countdown 3 секунды → analysis запускается
   - В /inbox видны рекомендации, все 9 правил применены

2. **Развилка → upload_later → возврат**
   - Регистрация → загрузка 7 обязательных (без рекомендуемых)
   - AI-classify возвращает needs_data, requestedAccounts=['43','76']
   - Юзер выбирает 'upload_later' → попадает в awaiting_additional_files
   - Юзер выходит из приложения, возвращается через 30 минут
   - Layout редиректит на /app/onboarding/resume
   - Юзер загружает 43 → AI-classify повторяется → success
   - Анализ завершается

3. **Развилка → continue_degraded**
   - То же что выше, но юзер выбирает 'continue_degraded'
   - analysis-results.classificationStatus = 'degraded'
   - На /app/inbox виден баннер «анализ на неполных данных»
   - Юзер может дозагрузить позже (баннер ведёт в Fork)

4. **cannot_classify**
   - Загрузка минимального набора, но данные противоречивы
   - AI возвращает cannot_classify
   - Юзер выбирает модель вручную → анализ запускается с classificationStatus='refused_manual'

5. **Override**
   - AI определил 'production', юзер в Confirm меняет на 'consulting'
   - businessModelUserOverridden=true, businessModelOriginalAi='production'
   - В аналитике это попадает в Override pairs дашборда

**Аналитика:**

- В коллекции onboarding-funnel-events есть 5+ записей с разными outcome
- На /admin/funnel видны все 6 блоков с непустыми данными
- Cron sweep работает: 1 abandoned-онбординг (с pause >24h)

**Регрессия:**

- При aiClassificationEnabled=false → онбординг проходит как v3.2 (все 9 правил, дефолт trading)
- Существующие тесты v3.2 проходят
- Демо-режим работает (AI-classify запускается, возвращает trading с высокой уверенностью)

**Качество кода:**

- TypeScript strict проходит без warnings
- Нет console.log в production-коде (только console.error для ошибок)
- Все новые eventTypes добавлены в whitelist логгера
- ESLint без errors

---

## Дальнейшие шаги (после v3.3.1, не в скоупе этих итераций)

- **Phase 2 миграция правил** — мигрировать ДЗ-2..СВС-1 на per-rule промпты
- **Модифицированные пороги для subscription/agency** — реализовать ⚠️-помеченные правила в rule-allowlist
- **Экспорт в PostHog** — для full-fledged product-аналитики
- **Алерты на падение конверсии** — slack-нотификация когда дроп > 20% за день
- **Фидбэк-петля для классификации** — отчёт «модели с override rate > 30%» для команды промптов
