# MMLabs AI-Advisor — Постановка для разработки v2.1

> **IDE:** Cursor
> **Модель:** Claude Opus 4.6 MAX
> **Требования:** `mmlabs-requirements-complete-v3.md`
> **Прототипы:** `docs/prototype/` (HTML-файлы mobile и web версий каждого экрана)
> **Демо-данные:** CSV-файлы ОСВ в `src/demo-data/`

---

## Что уже сделано (итерации 0–8)

| Итерация | Описание | Статус |
|----------|----------|--------|
| 0 | Инициализация (Next.js + Payload + MongoDB) | Done |
| 1 | Коллекции Payload CMS (9 + 1 глобал) | Done |
| 2 | Аутентификация (Google OAuth + allowlist) | Done |
| 3 | Layout (bottom nav + sidebar + responsive) | Done |
| 4 | Детерминированный парсер ОСВ (7 типов) | Done |
| 5 | Rules engine (9 правил + метрики) | Done |
| 6 | Seed-скрипт и демо-данные | Done |
| 7 | Онбординг (демо-режим) | Done |
| 8 | Inbox (финсводка + карточки) | Done |

---

## Что переделывается в итерации 9

| Было | Стало |
|------|-------|
| Google OAuth + allowlist | Email/пароль + инвайт-коды |
| `/auth` с кнопкой Google | Тизер на `/` + `/auth/register` + `/auth/login` |
| Демо-визард (4 шага) | Стартовый экран + загрузка файлов |
| `demo/preprod/production` | `trial/full/expired` |
| Seed демо на каждого | Демо только для тизера |
| `GlobalSettings.allowedEmails` | `InviteCodes` + `AccessRequests` |

---

## Общие правила

### Стек
Next.js 15+ (App Router, TS), Payload CMS 3.0+, MongoDB, Tailwind CSS 4 + shadcn/ui, Lucide React, Inter font.

### Правила фронта (НОВОЕ)

**Принципиально разная вёрстка для mobile и web:**
- Mobile (< 768px): max-width 430px, bottom nav, вертикальный стек, карусели свайпом, font-size 13–15px для тела, 20–24px для заголовков.
- Web (> 1024px): sidebar 260px, контент центрирован max-width 860–920px, щедрые padding 28–48px, font-size 15–16px для тела, 28–36px для заголовков.
- Tablet (768–1024px): адаптация mobile с центрированием.

**Принципы UI:**
- Без внутренних кодов правил (ДЗ-2, ЗАП-1) в пользовательском UI.
- Приоритет: тонкий цветной top-border + слово мелким шрифтом, не кричащий бейдж.
- Суммы крупным шрифтом — главный индикатор ценности.
- Обратная связь текстом «Да · Нет · Написать отзыв», без эмодзи.
- Просрочка: красный фон строки, не отдельный бейдж.
- Метрики человеческим языком: «Вам должны» вместо «Дебиторка».

**Прототипы как референс:**
Все HTML-прототипы лежат в `docs/prototype/`. При реализации каждого экрана — сверяться с прототипом по структуре, размерам шрифтов, отступам, цветовой палитре.

### Дизайн-токены

```css
--bg: #F8F7F4;
--white: #FFFFFF;
--ink: #141414;
--ink2: #3D3D3D;
--muted: #888680;
--border: #E0DDD6;
--green: #0F7B5C;
--green-bg: #ECF6F2;
--red: #C0392B;
--red-bg: #FDF0EE;
--amber: #B45309;
--amber-bg: #FEF3C7;
--yellow: #CA8A04;
--yellow-bg: #FEFCE8;
```

### Завершение каждой итерации
1. `npm run build` — без ошибок.
2. `git add . && git commit -m "iter-N: описание" && git push origin master`
3. Vercel авто-деплой. Проверить на production URL.

---

## Итерация 9: Адаптация авторизации и точки входа

### Цель
Заменить Google OAuth на email/пароль, добавить инвайт-коды, создать тизер, переделать маршрутизацию.

### Прототипы-референсы
- `docs/prototype/teaser-landing.html`
- `docs/prototype/auth-mobile.html`
- `docs/prototype/auth-web.html`

### Шаги

1. **Новые коллекции:** `InviteCodes` (code, createdBy, usedBy, isUsed, expiresAt, channel), `AccessRequests` (email, status, inviteCode, approvedAt).

2. **Обновить Users:** убрать Google OAuth. Payload built-in auth (email/password). Mode: `trial|full|expired`. Добавить: `trialExpiresAt`, `analysisStatus`, `inviteCode`. Cookie maxAge 30 дней.

3. **Обновить GlobalSettings:** убрать `allowedEmails`, `defaultMode`.

4. **Тизер** `src/app/(frontend)/page.tsx`: Hero + mock + CTA-блок. `<meta name="robots" content="noindex, nofollow">`. Структура — по прототипу `teaser-landing.html`.

5. **Регистрация** `src/app/(frontend)/auth/register/page.tsx`: форма имя/email/пароль, query param `?code=XXX`. Web-версия: split 50/50 (тёмная панель с value prop + форма). Mobile: полноэкранная форма. По прототипам `auth-mobile.html` и `auth-web.html`.

6. **Логин** `src/app/(frontend)/auth/login/page.tsx`: email/пароль. Ссылка «Забыли пароль?». Табы Регистрация/Вход на обоих экранах.

7. **Запрос доступа** `src/app/(frontend)/auth/request-access/page.tsx`: поле email → AccessRequest → «Свяжемся с вами».

8. **API:** `POST /api/invite-codes/validate`, `POST /api/access-requests`, `POST /api/auth/register`, обновить logout.

9. **Middleware:** `/` — публичный, `/auth/*` — публичный, `/app/*` — требует auth, `/app` root — редирект на inbox если onboarded.

10. **Удалить:** Google OAuth, `/api/auth/google*`, старую страницу логина, `clearDemoForUser` из logout.

### Критерий готовности
- Тизер на `/` без авторизации
- Код → регистрация → `/app`
- Email/пароль логин
- Cookie 30 дней

---

## Итерация 10: Стартовый экран и загрузка файлов

### Цель
Стартовый экран, загрузка файлов, распознавание, анализ, переход в inbox.

### Прототипы-референсы
- `docs/prototype/start-mobile.html`
- `docs/prototype/start-web.html`
- `docs/prototype/analysis-mobile.html`
- `docs/prototype/analysis-web.html`

### Шаги

1. **Стартовый экран** `/app/page.tsx`: редирект на inbox если onboarded. Иначе — StartScreen.

2. **StartScreen:** приветствие (36px web / 24px mobile), карусель 4 шага (grid 2×2 web / свайп mobile), CTA загрузки, справка по счетам (раскрыта web / details mobile).

3. **FileUploader:** drag-n-drop, ≤10 файлов, ≤10 Мб, .csv/.xlsx. Прогресс загрузки. Кнопка «Начать анализ».

4. **FileRecognitionTable:** live-обновление статуса каждого файла.

5. **AnalysisWaiting:** Split 50/50 web (тёмная панель с этапами + светлая с progress). Полноэкранный mobile. Этапы: распознавание → извлечение → метрики → правила → рекомендации. Экран завершения: 3 метрики (рекомендаций, сумма, критичных). Кнопка «К рекомендациям».

6. **API:** `POST /api/files/upload`, `POST /api/files/[id]/recognize`, `POST /api/files/[id]/parse`, `POST /api/analysis/run`.

7. **Убрать:** старый онбординг-визард, `/api/demo/seed`.

### Критерий готовности
- Стартовый экран при первом входе
- Загрузка → распознавание → анализ → inbox
- Навигация скрыта до онбординга

---

## Итерация 11: Экран «Мои задачи»

### Цель
Табличное и карточное представление задач с суммами, сроками, просроченностью.

### Прототипы-референсы
- `docs/prototype/tasks-mobile.html`
- `docs/prototype/tasks-web.html`

### Шаги

1. **Обновить коллекцию Recommendations:** добавить поля `dueDate` (date), `takenAt` (date), `resolvedAt` (date).

2. **Логика сроков:**
   - При смене статуса на `in_progress`: `takenAt = now`, `dueDate = now + 7 дней` (если не задан).
   - При смене на `resolved`: `resolvedAt = now`.
   - Просроченность вычисляется: `dueDate < now && status in ['in_progress', 'stuck']`.

3. **Страница** `/app/tasks/page.tsx`: Server component. Fetch Recommendations, все статусы кроме `new`. Рассчитать суммы по статусам.

4. **TaskSummary:** 4 метрики — в работе (₽), просрочено (₽), решено (₽), всего (шт). Шрифт: 28px web / 18px mobile.

5. **OverdueBanner:** Красный баннер если есть просроченные: «N задач просрочены на ₽X». С точкой-индикатором.

6. **TaskFilters:** Табы: Все, В работе, Решены, Зависли, Отклонены. Бейджи на «В работе» и «Зависли».

7. **ViewToggle:** Переключатель Таблица/Карточки. Default: таблица на web, карточки на mobile.

8. **TaskTable:**
   - Колонки: Задача (заголовок + тип), Сумма, Срок, Статус.
   - Просроченные строки: красный фон.
   - Сортировка: просроченные сверху → по сроку.
   - Клик по строке → раскрытие деталей или переход к карточке.

9. **TaskCards:**
   - Карточки с top-border (приоритет), суммой (крупно), заголовком, мета (дата, срок, просрочка), dropdown статуса.
   - 2 колонки web / 1 колонка mobile.
   - Просроченные: красный левый border.

10. **API:** обновить `PATCH /api/recommendations/[id]/status` — устанавливать `takenAt`, `dueDate`, `resolvedAt` при смене статуса.

11. **Бейдж на навигации:** На табе/пункте «Задачи» — бейдж с количеством просроченных (красный).

### Критерий готовности
- Таблица и карточки переключаются
- Суммы корректны
- Просроченные выделены
- Бейдж на навигации

---

## Итерация 12: Экран «Данные»

### Прототип: создать `docs/prototype/data-mobile.html`, `docs/prototype/data-web.html` по принципам из inbox/tasks.

### Шаги

1. **Страница** `/app/data/page.tsx`. Fetch UploadedFiles и AnalysisResults.

2. **Секции:** файлы (таблица), метрики (8 шт), топ-5 дебиторов (доля > 30% красная), топ-5 кредиторов.

3. **Кнопка «Загрузить новые файлы»** — ведёт на стартовый экран.

### Критерий готовности
- Все секции с данными, числа форматированы.

---

## Итерация 13: Обновление Inbox

### Цель
Привести inbox в соответствие с новым дизайном и добавить сводку задач.

### Прототипы-референсы
- `docs/prototype/inbox-mobile.html`
- `docs/prototype/inbox-web.html`

### Шаги

1. **Обновить карточки рекомендаций:** убрать коды правил, человеческий язык, приоритет через top-border, суммы крупно, обратная связь текстом.

2. **Добавить сводку задач:** баннер «В работе N задач на ₽X · Просрочено M на ₽Y» со ссылкой на `/app/tasks`.

3. **Баннер просроченных:** красный, если есть просроченные задачи.

4. **При «Взять в работу»:** установить `dueDate = now + 7 дней`, `takenAt = now`, перевести в `in_progress`.

### Критерий готовности
- Inbox соответствует прототипу
- Баннер задач показывает актуальные суммы
- «Взять в работу» устанавливает срок

---

## Итерация 14: AI-сервис (Claude API)

### Шаги

1. `npm install @anthropic-ai/sdk`
2. AI-клиент `src/lib/ai/client.ts`: `callAI()`, логирование в AIUsageLogs.
3. `GET /api/ai/status`: `{available: boolean}`.
4. Загрузчик промптов из AIPrompts.
5. Seed 4 промптов.
6. Fallback на шаблоны.
7. Подключить AI в пайплайн файлов и анализа.

### Критерий готовности
- AI-аудит создаёт карточки, fallback работает.

---

## Итерация 15: EventLog и логирование

### Шаги

1. Аудит всех событий из спецификации.
2. Добавить: `task.overdue`, `task.due_date_changed`, `access.request`, `invite.used`.
3. Фильтры в админке.

### Критерий готовности
- Полный цикл → все события в EventLog.

---

## Итерация 16: Полировка UI

### Шаги

1. **Пустые состояния:** inbox без рекомендаций, tasks без задач.
2. **Skeleton-лоадеры** на всех экранах.
3. **Ошибки:** невалидный файл, сеть, длинные названия.
4. **Триал:** баннер при < 3 дней, блокировка при expired, `/app/upgrade`.
5. **PWA:** manifest.json, иконки.
6. **robots.txt:** `Disallow: /`.

### Критерий готовности
- Все edge cases обработаны, PWA, robots.txt.

---

## Итерация 17: Финальное тестирование

### Шаги

1. Полный цикл: тизер → код → регистрация → стартовый → загрузка → анализ → inbox → задачи → данные → logout → повторный вход.
2. Кроссплатформенно: iPhone Safari, Android Chrome, Desktop Chrome/Firefox.
3. README.md.

### Критерий готовности
- Работает на production URL, mobile + desktop, без ошибок, README.
