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
