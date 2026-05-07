# MMLabs — Спецификация аналитики

> Детальная спецификация метрик и аналитики продукта. Краткий обзор — в `requirements.md` §11. Этот документ — для разработчика, который будет реализовывать сбор событий и admin-дашборд.

---

## 1. Принципы

**Зачем:** в первые недели после запуска критично понимать, где юзеры дропаются, какие модели чаще всего определяются, как работает развилка с дозагрузкой, и приводит ли degraded-классификация к худшему опыту.

**Принципы:**

1. **Двухуровневое логирование.** `event-log` — низкоуровневый (точечные события для отладки и аудита), `onboarding-funnel-events` — агрегированный (одна запись на онбординг с timeline для дашборда).
2. **Не блокировать.** Логирование никогда не должно ломать или замедлять основной флоу. Все вызовы `logEvent()` обёрнуты в try/catch с `console.error`. Сетевые ошибки в логах допустимы.
3. **Privacy.** В payload событий не попадают PII (email, имена контрагентов). Email хранится только в `users`, доступ — только admin'ам. В payload — `userId` (ObjectId).
4. **Retention.** `event-log` — минимум 12 месяцев. `onboarding-funnel-events` — без удаления (это история продукта).
5. **MVP-достаточность.** Дашборд воронки в Payload Admin — обязателен. Экспорт в PostHog/Amplitude — после MVP.

---

## 2. Каталог eventType

Все события пишутся в коллекцию `event-log`. Структура записи:

```ts
{
  owner: ObjectId<Users>,    // кто совершил действие (или admin для системных)
  eventType: string,          // см. таблицу ниже
  entityType?: string,        // 'recommendation' | 'file' | 'analysis-result' | 'user' | ...
  entityId?: string,          // ObjectId связанной сущности
  payload?: object,           // данные события (см. колонку payload)
  createdAt: Date             // авто
}
```

### 2.1. Аутентификация и доступ

| eventType | Когда | payload |
|---|---|---|
| `auth.registered` | Юзер зарегистрировался | `{email, hasInviteCode: bool, inviteCode?}` |
| `auth.login` | Успешный вход | `{mode}` |
| `auth.logout` | Выход | `{}` |
| `access.request` | Юзер запросил доступ | `{email}` |
| `access.approved` | Админ одобрил запрос | `{email, inviteCode}` |
| `access.rejected` | Админ отклонил запрос | `{email, reason?}` |
| `invite.used` | Использован инвайт-код | `{code, email}` |

### 2.2. Онбординг и загрузка файлов

| eventType | Когда | payload |
|---|---|---|
| `onboarding.started` | Юзер открыл `/app` (первый раз) | `{}` |
| `onboarding.file_upload` | Загружен файл | `{fileName, accountCode?, detected: bool, parseStatus, deterministicParseOk: bool, sizeBytes}` |
| `onboarding.file_removed` | Юзер удалил файл из набора | `{fileName, accountCode?}` |
| `onboarding.minimum_set_complete` | Загружены все обязательные счета | `{uploadedAccounts: string[]}` |
| `onboarding.recommended_set_complete` | Загружены все рекомендуемые счета (опц. событие) | `{uploadedAccounts: string[]}` |
| `onboarding.analysis_started` | Юзер нажал «Начать анализ» | `{filesCount, hasRecommended: bool, hasOptional: bool}` |
| `onboarding.analysis_completed` | Юзер дошёл до `/inbox` | `{recommendationsCount, durationMs, model, classificationStatus}` |

### 2.3. Файловый pipeline (AI-recognition / AI-extraction)

| eventType | Когда | payload |
|---|---|---|
| `file.recognition_started` | Запущен AI-recognition для файла | `{fileId, attemptedAt}` |
| `file.recognition_completed` | AI-recognition завершён | `{fileId, success: bool, accountCode?, period?, confidence?, durationMs}` |
| `file.extraction_started` | Запущен AI-extraction | `{fileId, attemptedAt, sizeBytes, truncated: bool}` |
| `file.extraction_completed` | AI-extraction завершён | `{fileId, success: bool, durationMs, entityCount?}` |
| `file.parse_error` | Ошибка парсинга (детерминированного или AI) | `{fileId, error, stage}` |

### 2.4. Классификация бизнес-модели

| eventType | Когда | payload |
|---|---|---|
| `classification.started` | Запущен `/api/analysis/classify` | `{attempt, availableAccounts: string[]}` |
| `classification.completed` | Получен ответ AI | `{status, model?, confidence?, attempt, indicatorsKeys: string[], durationMs}` |
| `classification.confirmed` | Юзер подтвердил модель | `{model, autoConfirmed: bool, finalConfidence}` |
| `classification.user_override` | Юзер сменил модель в UI | `{originalModel, newModel, originalConfidence}` |
| `classification.additional_data_requested` | AI запросил доп. счета | `{requestedAccounts: string[], attempt, currentBestGuess: string, currentConfidence}` |
| `classification.user_choice` | Юзер выбрал вариант в развилке | `{choice: 'upload_now' \| 'upload_later' \| 'continue_degraded', attempt}` |
| `classification.degraded_accepted` | Принята degraded-классификация | `{model, confidence, missingAccounts: string[]}` |
| `classification.refused_manual_override` | После cannot_classify юзер выбрал вручную | `{model, attempts}` |
| `classification.refused_contact_requested` | После cannot_classify выбрано «связаться» | `{}` |

### 2.5. Wizard состояния

| eventType | Когда | payload |
|---|---|---|
| `wizard.state_changed` | Любая смена `wizardState` | `{fromState, toState, durationMs?}` |
| `wizard.paused` | Wizard переведён в `awaiting_additional_files` | `{requestedAccounts: string[]}` |
| `wizard.resumed` | Юзер вернулся из паузы | `{previousState, hoursAway: number}` |
| `wizard.abandoned` | Юзер вышел в одном из промежуточных состояний без возврата за 24 часа (вычисляется фоновой задачей) | `{lastState, hoursIdle}` |

### 2.6. AI-сервис

| eventType | Когда | payload |
|---|---|---|
| `ai.request` | Старт вызова Claude | `{promptKey, promptVersion, model, stage?}` |
| `ai.response` | Успешный ответ | `{promptKey, promptVersion, model, inputTokens, outputTokens, durationMs, stage?}` |
| `ai.error` | Ошибка/таймаут | `{promptKey, error, stage?}` |
| `ai.fallback` | Сработал fallback на шаблон | `{promptKey, reason}` |

`stage` принимает значения: `file_recognition`, `data_extraction`, `classification`, `rule_<code>`.

### 2.7. Рекомендации

| eventType | Когда | payload |
|---|---|---|
| `recommendation.created` | Создана рекомендация | `{recId, ruleCode, priority, isAiEnhanced: bool}` |
| `recommendation.viewed` | Юзер увидел карточку (на /inbox или /tasks) | `{recId}` |
| `recommendation.status_changed` | Смена статуса | `{recId, from, to}` |
| `recommendation.text_copied` | Скопирован текст | `{recId}` |
| `recommendation.feedback` | Оставлена обратная связь | `{recId, rating: 'positive' \| 'negative', hasComment: bool}` |
| `recommendation.due_date_changed` | Изменён срок | `{recId, oldDate, newDate}` |
| `task.overdue` | Задача стала просроченной (фоновая задача) | `{recId, dueDate, amount}` |

### 2.8. Навигация

| eventType | Когда | payload |
|---|---|---|
| `page.view` | Открыт экран | `{page: 'inbox' \| 'tasks' \| 'data' \| 'upgrade' \| ...}` |

---

## 3. Коллекция `OnboardingFunnelEvents`

Агрегированная запись на каждый онбординг. Создаётся при первом `onboarding.started`, обновляется на каждом значимом событии, финализируется при `onboarding.analysis_completed`. Это основной источник для дашборда воронки.

### 3.1. Зачем нужна

`event-log` — это поток сырых событий. Для построения воронки потребовалось бы каждый раз делать тяжёлый агрегирующий query: «возьми все события юзера X, отсортируй, вычисли deltas». На сотне юзеров это работает, на тысяче — медленно. `onboarding-funnel-events` хранит уже посчитанные deltas и финальные состояния — дашборд читает оттуда без агрегаций.

Также эта коллекция переживает ротацию `event-log` (если в будущем введём retention 12 мес).

### 3.2. Структура полей

```ts
interface OnboardingFunnelEvent {
  _id: ObjectId
  owner: ObjectId<Users>          // на кого онбординг
  attemptNumber: number           // 1 для первого онбординга, 2+ если юзер повторно (после миграции, например)

  // Флаги достижения шагов воронки
  reachedStart: boolean           // открыл /app
  reachedUpload: boolean          // загрузил хотя бы 1 файл
  reachedMinimumSet: boolean      // загрузил все 7 обязательных
  reachedRecommendedSet: boolean  // загрузил все 4 рекомендуемых
  reachedRecognition: boolean     // прошёл AI-recognition (если требовался)
  reachedExtraction: boolean      // прошёл AI-extraction (если требовался)
  reachedClassification: boolean  // получен ответ от AI-classify
  reachedConfirmation: boolean    // подтвердил модель
  reachedAnalysis: boolean        // дошёл до /inbox

  // Времена шагов (ISO date или null)
  startedAt: Date | null          // = createdAt
  uploadStartedAt: Date | null
  minimumSetCompletedAt: Date | null
  recommendedSetCompletedAt: Date | null
  classificationStartedAt: Date | null
  classificationCompletedAt: Date | null
  confirmationCompletedAt: Date | null
  analysisCompletedAt: Date | null
  abandonedAt: Date | null        // если онбординг был abandoned (24+ часа без активности)

  // Длительности (мс) — вычисляются как разности времён, заполняются на финале
  durationToUpload: number | null
  durationUpload: number | null               // от первого файла до minimum_set_complete
  durationRecognition: number | null
  durationExtraction: number | null
  durationClassification: number | null
  durationConfirmation: number | null         // от показа экрана подтверждения до клика
  durationAnalysis: number | null             // от подтверждения до /inbox
  durationTotal: number | null                // startedAt → analysisCompletedAt

  // Файлы и счета
  filesUploaded: number
  uploadedAccounts: string[]                  // ['90.01', '60', ...]
  missingRequiredAccounts: string[]           // что не загрузили из обязательного
  missingRecommendedAccounts: string[]        // что не загрузили из рекомендуемого

  // Классификация
  classificationAttempts: number              // сколько раз запускалась
  classificationFinalStatus: 'success' | 'degraded' | 'refused_manual' | 'disabled' | null
  initialAiModel: string | null               // что AI определил при первой попытке
  initialAiConfidence: number | null
  finalModel: string | null                   // итоговая модель (после override / degraded)
  finalConfidence: number | null
  userOverridden: boolean                     // юзер сменил модель?
  hasDataQualityWarning: boolean
  requestedAccountsHistory: string[][]        // массив массивов: что AI просил на каждой попытке

  // Развилка дозагрузки — выборы юзера
  forkChoices: Array<{
    attempt: number
    choice: 'upload_now' | 'upload_later' | 'continue_degraded'
    timestamp: Date
  }>
  pauseCount: number                          // сколько раз был в awaiting_additional_files
  totalPauseDurationMs: number                // суммарное время в паузе

  // Финал
  outcome: 'completed' | 'abandoned' | 'refused' | 'in_progress' | null
  recommendationsCreated: number              // сколько рекомендаций создано
  // outcome=completed → дошёл до /inbox
  // outcome=abandoned → 24+ часа без активности в промежуточном состоянии
  // outcome=refused → юзер видел экран отказа и не выбрал ручной режим
  // outcome=in_progress → онбординг ещё идёт
}
```

### 3.3. Правила записи

**Создание.** При первом `onboarding.started` — создаётся запись с `outcome='in_progress'`, `attemptNumber` = (max существующих для юзера) + 1.

**Обновление.** Helper `updateFunnelEvent(userId, patch)` мержит изменения. Вызывается из обработчиков всех ключевых событий.

**Финализация.** При `onboarding.analysis_completed` или `wizard.abandoned` — выставляется `outcome` и считаются все `durationXxx` поля.

**Atomic.** Используем MongoDB `$set`, чтобы избежать гонок (онбординг — линейный процесс, гонок не должно быть, но на всякий случай).

**Idempotency.** Повторная запись одного и того же события не должна испортить агрегаты. Например, `onboarding.minimum_set_complete` может прилететь дважды — `minimumSetCompletedAt` ставится только если ещё `null`.

### 3.4. Фоновая задача abandoned

Cron-задача (или Vercel scheduled function) каждый час:
- Берёт все `onboarding-funnel-events` с `outcome='in_progress'` и `updatedAt < now - 24h`
- Выставляет `outcome='abandoned'`, `abandonedAt=now`, пишет `lastState` в payload
- Эмитит `wizard.abandoned` в `event-log`

Это позволяет считать финальные конверсии и отделять «активные» онбординги от «брошенных».

### 3.5. Access control

- Read: только `admin`
- Write: системно (через helper из server-side кода)
- Юзер сам своих funnel-событий не видит

---

## 4. Дашборд воронки в Admin (`/admin/funnel`)

Отдельный экран в Payload Admin. Доступ — только `admin`. Реализация — кастомная страница в Payload (через `admin.components.views`).

### 4.1. Глобальные фильтры (вверху страницы)

| Фильтр | Дефолт | Опции |
|---|---|---|
| Период | Последние 30 дней | Сегодня / 7 дней / 30 дней / Custom range |
| Тариф | Все | trial / full / expired |
| Статус классификации | Все | success / degraded / refused_manual / disabled |
| Только завершённые | Off | Если on — только `outcome='completed'` |

Все блоки ниже учитывают эти фильтры.

### 4.2. Блок 1 — Воронка регистрация → /inbox

Горизонтальный funnel chart (или таблица с барами):

| Шаг | Юзеров | % от регистрации | % от предыдущего |
|---|---|---|---|
| Зарегистрировались | 100 | 100% | — |
| Открыли /app | 95 | 95% | 95% |
| Загрузили хотя бы 1 файл | 78 | 78% | 82% |
| Загрузили все обязательные | 62 | 62% | 79% |
| Дошли до классификации | 58 | 58% | 94% |
| Подтвердили модель | 55 | 55% | 95% |
| Дошли до /inbox | 53 | 53% | 96% |

Для каждой строки — клик по числу открывает таблицу юзеров, кто **не прошёл** этот шаг (упростит работу с saving customer support).

### 4.3. Блок 2 — Развилка needs_data

Видна, если в фильтруемом наборе хотя бы один онбординг попадал в развилку.

**Карточки:**
- **Всего попало в развилку:** N юзеров (M%)
- **Распределение выборов:**
  - Загрузить сейчас: X юзеров (X%)
  - Отложить: Y юзеров (Y%)
  - Продолжить без файлов: Z юзеров (Z%)
- **Из тех, кто отложил:**
  - Вернулись: A юзеров (A%)
  - Среднее время до возврата: B часов
  - Не вернулись (abandoned): C юзеров

**Таблица «Чаще всего просим эти счета»** (top-5):

| Счёт | Сколько раз AI просил | % от всех развилок |
|---|---|---|
| 43 | 27 | 45% |
| 76 | 18 | 30% |
| 26 | 9 | 15% |

Это поможет понять, какие индикаторы критически нужны и стоит ли их перевести из «рекомендуемых» в «обязательные».

### 4.4. Блок 3 — Распределение моделей

**Гистограмма:** 13 моделей × количество юзеров. Сортировка по убыванию.

**Таблица деталей:**

| Модель | Юзеров | Avg confidence | % overrides | % degraded |
|---|---|---|---|---|
| trading | 45 | 0.89 | 8% | 11% |
| consulting | 12 | 0.81 | 17% | 25% |
| project_trading | 8 | 0.72 | 25% | 38% |

`% overrides` — какой процент юзеров поменял предложенную AI модель.
`% degraded` — какой процент юзеров принял low-confidence без дозагрузки.

Высокий override rate для модели = промпт промахивается на этом сегменте, надо смотреть в детали.

### 4.5. Блок 4 — Override pairs (топ ошибок AI)

Топ-5 пар «AI определил X → юзер исправил на Y»:

| AI определил | Юзер исправил на | Случаев | Avg confidence AI |
|---|---|---|---|
| trading | production_trading | 4 | 0.71 |
| consulting | consulting_subscription | 3 | 0.65 |
| project | project_trading | 2 | 0.78 |

Это напрямую даёт сигнал: «AI часто путает X с Y» → нужно либо корректировать матрицу, либо промпт, либо собирать больше индикаторов.

### 4.6. Блок 5 — Времена обработки

Карточки с p50 / p95 / p99 для каждой стадии:

| Стадия | p50 | p95 | p99 |
|---|---|---|---|
| AI-recognition (per file) | 2.1 c | 4.8 c | 6.2 c |
| AI-extraction (per file) | 5.4 c | 8.7 c | 9.5 c |
| AI-classification | 3.2 c | 4.6 c | 5.1 c |
| AI-enhance (per recommendation) | 4.8 c | 12.4 c | 14.7 c |
| Total onboarding (полный путь) | 4 мин | 23 мин | 2 ч |

«Total onboarding» считается только для `outcome='completed'`. Большая разница между p50 и p95/p99 в total — индикатор паузы (юзеры отложили дозагрузку и потом вернулись).

### 4.7. Блок 6 — Cohort retention

**Когорта:** месяц онбординга. **Метрики:** D1, D7, D30 retention (вернулся в `/app` хотя бы раз).

| Когорта | Юзеров | D1 | D7 | D30 |
|---|---|---|---|---|
| 2026-04 | 53 | 78% | 45% | 23% |
| 2026-03 | 41 | 75% | 51% | 28% |

Дополнительный разрез — по `classificationFinalStatus`:

| Статус | D7 retention |
|---|---|
| success | 52% |
| degraded | 38% |
| refused_manual | 19% |
| disabled | 41% |

Если у `degraded` retention заметно ниже success — это сигнал, что наш «продолжить без файлов» — рискованный путь, нужно либо лучше доносить ценность дозагрузки, либо повышать качество анализа на degraded-данных.

### 4.8. Экспорт

Кнопка «Экспорт CSV» в правом верхнем углу страницы — выгружает все `onboarding-funnel-events` за период с фильтрами для внешнего анализа.

---

## 5. API для дашборда

Все endpoints — admin-only (проверка `req.user.role === 'admin'`).

### 5.1. Агрегаты для блоков

```
GET /api/admin/funnel/overview?period=30d&mode=trial
→ {
  funnelSteps: Array<{ name, users, pctFromStart, pctFromPrev, droppedUsers: number }>,
  forkAnalysis: {
    totalInFork,
    choices: { upload_now, upload_later, continue_degraded },
    returnedFromPause: { count, avgHoursToReturn, abandoned },
    topRequestedAccounts: Array<{ account, count, pct }>
  },
  models: Array<{ id, name, count, avgConfidence, overridePct, degradedPct }>,
  overridePairs: Array<{ originalModel, newModel, count, avgOriginalConfidence }>,
  durations: {
    recognition: { p50, p95, p99 },
    extraction: { p50, p95, p99 },
    classification: { p50, p95, p99 },
    enhance: { p50, p95, p99 },
    total: { p50, p95, p99 }
  },
  cohorts: Array<{ month, users, d1, d7, d30, byStatus: { ... } }>
}
```

### 5.2. Drill-down

```
GET /api/admin/funnel/users?step=upload_started&completed=false&period=30d
→ Array<{ userId, email, lastState, lastActivityAt, missingAccounts, hasInviteCode, ... }>
```

Возвращает список юзеров, дропнувшихся на конкретном шаге. Для customer success.

### 5.3. Экспорт

```
GET /api/admin/funnel/export?period=30d&mode=trial&format=csv
→ CSV stream
```

Все `onboarding-funnel-events` плоской таблицей.

---

## 6. План реализации

| Шаг | Задача | Зависимости |
|---|---|---|
| 1 | Создать коллекцию `onboarding-funnel-events` (схема, access control) | — |
| 2 | Реализовать helper `updateFunnelEvent(userId, patch)` с idempotency | 1 |
| 3 | Внедрить вызовы `updateFunnelEvent` во все ключевые точки (upload, classify, confirm, analysis-completed) | 2 |
| 4 | Расширить `event-log` новыми eventType из §2 (если ещё не все есть) | — |
| 5 | Cron-задача для abandoned-онбордингов | 1, 3 |
| 6 | API endpoints для дашборда (`/api/admin/funnel/*`) | 1, 3 |
| 7 | Кастомная Payload Admin страница `/admin/funnel` (UI с recharts) | 6 |
| 8 | Проверка end-to-end: пройти все 4 пути онбординга, убедиться, что цифры в дашборде корректны | 1-7 |

Полная спека в `cursor-dev-spec.md` (новые итерации после рефакторинга).

---

## 7. Future scope (после MVP)

**Экспорт в PostHog или Amplitude.** Для полноценного product-аналитика нужны фичи, которые делать своими руками не имеет смысла:
- Funnels с multi-step splits
- Cohort retention с фильтрами по любым свойствам
- A/B-тесты с статистической значимостью
- Session replay

Реализация: бэкенд-side worker, который читает новые `event-log` записи и шлёт в PostHog (через их Node SDK). Локальный дашборд оставляем для quick check.

**Алерты.** Если конверсия на каком-то шаге падает > 20% за день — slack-уведомление в команду.

**Фидбэк-петля для классификации.** Регулярный отчёт «модели, у которых override rate > 30%» — для команды промптов.

**Когортный фидбэк.** Сводка «у юзеров с degraded-классификацией доля feedback=positive ниже на X%» — индикатор, что качество рекомендаций для них реально хуже.
