# MMLabs — Полные требования к прототипу (MVP) v3.2

> Изменения относительно v3.1: добавлены AI-обогащение рекомендаций (per-rule промпты) и AI-распознавание/извлечение нестандартных файлов 1С с прогрессивной загрузкой через client-driven polling (Vercel Hobby compatible).

---

## Изменения относительно v2

**Пользовательский путь (v3):**
1. Убран Google OAuth → email/пароль через Payload Auth.
2. Убран демо-режим → демо-результаты на тизере и стартовом экране.
3. Добавлен публичный тизер (`mmlabs.ru`).
4. Добавлена система инвайт-кодов (ввод кода + запрос доступа).
5. Добавлен стартовый экран внутри `/app`.
6. Один режим работы — триал 7 дней → полный тариф.
7. Сессия 30 дней.

**Система задач (v3.1):**
8. Добавлены сроки и просроченность задач (`dueDate`, `overdueAt`).
9. Табличное представление задач с суммами и сроками.
10. Переключение таблица/карточки.
11. Суммарный денежный эффект в задачах и inbox.
12. Визуальные напоминания о просроченных задачах.

**AI-обогащение и AI-распознавание (v3.2):**
13. **AI-обогащение рекомендаций.** Правила теперь выдают `RuleCandidate` (только числа и сигналы), а текст рекомендации (заголовок, описание, краткая рекомендация, готовое письмо) генерирует Claude по индивидуальному промпту правила (`rule_<code>` в коллекции `ai-prompts`). Если AI выключен/недоступен/упал — пользователь видит детерминированный шаблон. Пилот включён только для правила `ДЗ-1`; остальные 8 правил используют шаблоны.
14. **AI-распознавание файлов.** Если регулярка не нашла каноничный заголовок 1С ОСВ или строгий парсер упал, файл помечается `needs_ai_recognition` → AI-recognition (cheap, ~2-3 c) восстанавливает `accountCode`/`period`/`columnFormat`, затем lenient-парсер парсит данные с подсказками. Если и это не помогло — `needs_ai_extraction` и Claude извлекает структурированные данные целиком (~5-9 c).
15. **Прогрессивная загрузка.** Анализ разбит на стадии (recognition → extraction → metrics → rules → AI-enhancement), каждая поллится отдельным endpoint'ом, чтобы вписаться в 10-секундный лимит Vercel Hobby. UI показывает прогресс «X из Y» по каждой стадии.
16. **Graceful degradation.** Все AI-стадии управляются флагами в `GlobalSettings` (`aiRulesEnabled`, `aiFileExtractionEnabled`) и по умолчанию выключены — без AI продукт работает как в v3.1.

---

## 1. Пользовательский путь

### 1.1. Полная схема

```
mmlabs.ru (публичный тизер)
    ├── Ввод инвайт-кода → Регистрация (email/пароль)
    └── Запрос доступа → Одобрение → Email с кодом → Регистрация
                                        ↓
                              /app (стартовый экран)
                              Карусель «Как это работает»
                              + CTA «Загрузить файлы»
                                        ↓
                              Загрузка CSV из 1С
                                        ↓
                              Ожидание анализа (~1 мин)
                                        ↓
                              /app/inbox (рекомендации)
                              ↕ /app/tasks · /app/data
                                        ↓
                              [Будущее] /app/upgrade
```

### 1.2. Состояния пользователя

| Состояние | Маршрут | Условие |
|-----------|---------|---------|
| Не авторизован | `mmlabs.ru` (тизер) | Нет cookie |
| Авторизован, первый визит | `/app` (стартовый экран) | `hasCompletedOnboarding === false` |
| Анализ в процессе | `/app` (ожидание) | `analysisStatus === 'processing'` |
| Анализ готов | `/app/inbox` | `hasCompletedOnboarding === true` |
| Повторный визит | `/app/inbox` | Сессия активна |

### 1.3. Два пути получения доступа

**Путь A — Инвайт-код:** ввод на тизере → регистрация → `/app`.
**Путь B — Запрос доступа:** email на тизере → одобрение админом → email с кодом → как путь A.

---

## 2. Структура сервиса

1. **Публичный тизер** — `mmlabs.ru` (раздел 3).
2. **Личный кабинет** — `/app/*` (раздел 4).
3. **Административная панель** — Payload CMS `/admin` (раздел 5).
4. **Сервис анализа** — парсер + AI + rules engine (раздел 6).
5. **AI-сервис** — Claude API (раздел 7).
6. **Логирование** — EventLog (раздел 8).

---

## 3. Публичный тизер

Один-два экрана. Закрыт от индексации (`robots.txt` + `noindex`).

**Hero:** Заголовок с болью, пример карточки рекомендации с реальными цифрами, CTA-блок.

**CTA-блок:** поле для инвайт-кода + «Получить доступ», ссылка «Запросить доступ», ссылка «Войти».

**Прототип:** `docs/prototype/teaser-landing.html`

---

## 4. Личный кабинет

### 4.1. Стартовый экран (`/app`, `hasCompletedOnboarding === false`)

Приветствие, карусель «Как это работает» (4 шага), CTA загрузки файлов, справка по счетам.

**Прототипы:** `docs/prototype/start-mobile.html`, `docs/prototype/start-web.html`

### 4.2. Загрузка и ожидание анализа

Drag-n-drop, таблица распознавания, progress bar, экран завершения с метриками.

**Стадии прогресса (НОВОЕ в v3.2):**

| Стадия | Видна когда | Подпись прогресса |
|--------|-------------|-------------------|
| 1. AI-распознавание файлов | Есть файлы со статусом `needs_ai_recognition` | «AI-распознавание файлов · X из Y» |
| 2. AI-извлечение данных | Есть файлы со статусом `needs_ai_extraction` | «AI-извлечение данных · X из Y» |
| 3. Расчёт метрик | Всегда | «Считаем метрики компании» |
| 4. Правила (rules engine) | Всегда | «Формируем рекомендации» |
| 5. AI-обогащение рекомендаций | Если включено `aiRulesEnabled` и есть правила в `aiRulesEnabledFor` | «AI-анализ: X из Y» |

Стадии 1 и 2 скрываются, если ни один файл их не требует (каноничные файлы 1С парсятся синхронно регуляркой). Стадия 5 скрывается, если AI выключен или для всех кандидатов уже подставлен fallback-текст.

**Демо-режим:** стадии 1-2 пропускаются (демо-данные всегда каноничны). Стадия 5 запускается, если включён AI.

**Прототипы:** `docs/prototype/analysis-mobile.html`, `docs/prototype/analysis-web.html`

### 4.3. Навигация

| Элемент | Mobile/Tablet | Desktop |
|---------|---------------|---------|
| Тип | Bottom nav | Sidebar 260px |
| Пункты | Входящие, Задачи, Данные | Те же + имя, выход |
| Бейджи | Кол-во новых (inbox), просроченных (tasks) | Те же |

### 4.4. Экран «Входящие» (`/app/inbox`)

**Финансовая сводка:** Выручка, «Вам должны» (ДЗ), «Вы должны» (КЗ), оборачиваемость ДЗ/КЗ, рентабельность, health index.

**Баннер задач (НОВОЕ):** Если есть задачи в работе или просроченные — показать сводку: «В работе 3 задачи на ₽8.3M · Просрочено 2 на ₽5.2M» со ссылкой на `/app/tasks`.

**Баннер просроченных (НОВОЕ):** Если есть просроченные задачи — красный баннер: «2 задачи просрочены на ₽5.2M».

**Лента рекомендаций:** Карточки в статусе `new`, сортировка по приоритету. Структура карточки:
- Приоритет (тонкий верхний border: красный/оранжевый/жёлтый) + слово в углу
- Заголовок (человеческий язык, без кодов правил)
- Сумма влияния
- Описание + рекомендация (два столбца на desktop)
- Действия: «Взять в работу», «Не сейчас», «Скопировать текст»
- Обратная связь: «Да · Нет · Написать отзыв» (текстом, без эмодзи)

**Прототипы:** `docs/prototype/inbox-mobile.html`, `docs/prototype/inbox-web.html`

### 4.5. Экран «Мои задачи» (`/app/tasks`) — ОБНОВЛЕНО

Рабочий инструмент CEO для управления задачами. Два представления: таблица и карточки.

**Суммарная сводка (всегда видна):**

| Метрика | Описание |
|---------|----------|
| В работе | Сумма `impactAmount` задач со статусом `in_progress` |
| Просрочено | Сумма задач, где `dueDate < сегодня` и статус `in_progress` или `stuck` |
| Решено | Сумма задач со статусом `resolved` |
| Всего задач | Общее количество задач (все статусы кроме `new`) |

**Баннер просроченных:** Красный баннер с количеством и суммой просроченных задач. Отображается, если есть хотя бы одна просроченная задача.

**Табы фильтрации:** Все, В работе, Решены, Зависли, Отклонены. Бейдж с количеством на табе «В работе» и «Зависли».

**Переключатель представления:** Таблица / Карточки. На desktop по умолчанию таблица, на mobile — карточки.

**Табличное представление:**

| Колонка | Содержание |
|---------|------------|
| Задача | Заголовок + подзаголовок (тип проблемы) |
| Сумма | `impactAmount` в рублях, красный цвет для просроченных |
| Срок | `dueDate`, красный текст + «(просрочена N дн.)» если просрочена |
| Статус | Бейдж: В работе / Решена / Зависла / Отклонена |

Сортировка: по умолчанию — просроченные сверху, затем по сроку. Кликабельная — по сумме, по сроку, по статусу.

Просроченные строки выделяются красным фоном.

**Карточное представление:**

Карточки с приоритетом (верхний border), суммой, заголовком, метаданными (дата взятия, срок, просрочка), dropdown статуса.

На desktop — сетка 2 колонки. На mobile — одна колонка.

Просроченные карточки: левый красный border.

**Прототипы:** `docs/prototype/tasks-mobile.html`, `docs/prototype/tasks-web.html`

### 4.6. Экран «Данные» (`/app/data`)

Файлы, метрики, топ-5 дебиторов, топ-5 кредиторов. Без изменений от v2.

### 4.7. Экран «Обновление тарифа» (`/app/upgrade`) — будущее

Описание полного тарифа, заблокированная кнопка «Выбрать слот для созвона».

### 4.8. Дизайн-система

| Параметр | Значение |
|----------|----------|
| Подход | Отдельная вёрстка для mobile и web |
| Mobile | max-width 430px, bottom nav, вертикальный стек |
| Web | sidebar 260px, контент до 920px, щедрые отступы |
| Фон | `#F8F7F4` |
| Карточки | `#FFFFFF`, border `#E0DDD6`, radius 12–14px |
| Акцент | `#0F7B5C` (green) |
| Текст | `#141414` (primary), `#3D3D3D` (secondary), `#888680` (muted) |
| Шрифт | Inter (Latin + Cyrillic), 400/500/600/700/800 |
| Заголовки web | 28–36px, letter-spacing -.02em |
| Заголовки mobile | 20–24px |
| Тело текста web | 15–16px |
| Тело текста mobile | 13–15px |
| Padding карточек web | 22–32px |
| Padding карточек mobile | 14–16px |
| Тач-таргеты | ≥ 44px |

**Цвета приоритетов:**
- Критично: `#C0392B` (red), фон `#FDF0EE`
- Высокий: `#B45309` (amber), фон `#FEF3C7`
- Средний: `#CA8A04` (yellow), фон `#FEFCE8`
- Низкий: `#888680` (gray)

**Принципы UI (НОВОЕ):**
- Без внутренних кодов (ДЗ-2, ЗАП-1) в пользовательском интерфейсе — только человеческий язык.
- Без иконок-эмодзи в обратной связи — текстовые ссылки.
- Приоритет обозначается тонким цветным border, не кричащими бейджами.
- Денежные суммы — крупным шрифтом, это главный индикатор ценности.
- Просроченные элементы — красный фон строки/карточки, не отдельный бейдж.

---

## 5. Коллекции Payload CMS

### Обновлённые поля Recommendations

К существующим полям добавляются (v3.1):

| Поле | Тип | Описание |
|------|-----|----------|
| dueDate | date, optional | Срок выполнения. Ставится автоматически при «Взять в работу» = createdAt + 7 дней. Пользователь может изменить. |
| takenAt | date, optional | Когда пользователь нажал «Взять в работу» |
| resolvedAt | date, optional | Когда отмечена как решена |

Поле `overdueAt` не хранится — вычисляется: если `dueDate < now` и `status in ['in_progress', 'stuck']`.

**Новые поля для AI-обогащения (v3.2):**

| Поле | Тип | Описание |
|------|-----|----------|
| aiEnhanced | checkbox, default false | `true`, если текст рекомендации сформировал Claude (а не fallback-шаблон). Для AI-eligible правил создаётся со значением `false` и переключается в `true` после успешного `/api/analysis/ai-enhance-batch`. |
| signals | json | Структурированные данные для AI: пары `{ключ: число\|строка\|bool}`, специфичные для каждого правила (например, для `ДЗ-1` — `balance`, `consecutiveNoPayment`, `recentPayments`, `paymentRatio`, `penaltyAmount`). |
| aiEnhanceFailedAt | date, optional | Время последней неудачной попытки AI-обогащения. Используется для cooldown'а (5 мин до повтора). |
| aiEnhanceError | text, optional | Код последней ошибки AI: `ai_timeout_or_unavailable`, `ai_invalid_json`, и т.п. |

### Обновлённая UploadedFiles (v3.2)

**Новые значения `parseStatus`:**

| Значение | Описание |
|----------|----------|
| needs_ai_recognition | Регулярка не нашла каноничный заголовок ОСВ или строгий парсер упал — файл ждёт AI-recognition. |
| needs_ai_extraction | AI-recognition восстановил `accountCode`/`period`, но lenient-парсер всё равно не смог извлечь сущности — нужен полный AI-extract. |

Существующие значения сохраняются: `pending`, `recognizing`, `parsing`, `success`, `warning`, `error`.

**Новое поле `aiRecognitionLog` (json, массив):** добавляется по записи на каждую попытку AI-recognition или AI-extraction:

```
{
  attemptedAt: ISO date,
  promptKey: 'file_recognition' | 'data_extraction',
  promptVersion: number,
  model: string,
  success: boolean,
  durationMs: number,
  inputBytes: number,
  inputTokens?: number,
  outputTokens?: number,
  rawResponse?: string (первые 500 символов для дебага),
  error?: string
}
```

**Обновлённая структура `parsedData`:**

```
{
  raw: string,                       // оригинал файла (всегда)
  parsed?: ParsedAccountData,        // результат детерминированного парсера (предпочтителен)
  aiParsed?: ParsedAccountData,      // результат AI-extraction (fallback, если parsed отсутствует)
  aiHints?: AIFileHints,             // подсказки от AI-recognition
  truncated?: boolean,               // true, если файл был обрезан перед AI-extract
  truncatedAtBytes?: number
}
```

### Обновлённая GlobalSettings (v3.2)

**Новые поля:**

| Поле | Тип | По умолч. | Описание |
|------|-----|-----------|----------|
| aiRulesEnabled | checkbox | false | Включает AI-обогащение текста рекомендаций. Если выключено — все правила используют статические шаблоны. |
| aiRulesEnabledFor | multi-select | `['ДЗ-1']` | Список кодов правил, для которых разрешено AI-обогащение. Остальные используют шаблоны даже при включённом флаге. |
| aiRulesBatchSize | number 1-10 | 3 | Сколько кандидатов обрабатывается за один вызов `/api/analysis/ai-enhance-batch` (Hobby: 2-3, Pro: 5-8). |
| aiFileExtractionEnabled | checkbox | false | Включает AI-распознавание/извлечение нестандартных файлов 1С. Если выключено — нестандартные форматы CSV отбрасываются с предупреждением, как в v3.1. |
| aiFileExtractionMaxKB | number 10-500 | 100 | Лимит размера файла для AI-extraction. Файлы больше будут обрезаны (с пометкой `truncated`). |
| aiFileBatchSize | number 1-5 | 2 | Файлов на один вызов `/api/files/ai-recognize-batch` (Hobby: 2, Pro: 3-5). |

### Новые коллекции

**AccessRequests:** email, status (pending/approved/rejected), inviteCode, approvedAt.

**InviteCodes:** code (unique), createdBy, usedBy, isUsed, expiresAt, channel.

### Обновлённая Users

Поле `mode`: `trial | full | expired` (вместо demo/preprod/production).
Добавлены: `trialExpiresAt`, `analysisStatus`, `inviteCode`.
Убраны: Google OAuth, allowedEmails.

Остальные коллекции (RecommendationFeedback, AnalysisResults, AIPrompts, AIUsageLogs, EventLog) — без изменений от v2.

---

## 6–7. Сервис анализа и AI

### 6.1. Конвейер обработки файлов (обновлено в v3.2)

```
POST /api/files/upload  (синхронно, без AI, ≤2 c)
   ├─ для каждого файла:
   │   ├─ identifyFile() — регулярка по первой строке
   │   ├─ Если совпало → parseOSVFile() → success + parsedData.parsed
   │   └─ Если не совпало (или парсер упал):
   │       ├─ aiFileExtractionEnabled=true → needs_ai_recognition
   │       └─ aiFileExtractionEnabled=false → warning (legacy)
   └─ Возврат: { files, needsAi: <count> }

Клиент поллит POST /api/files/ai-recognize-batch  (по 2 файла за вызов)
   └─ для каждого файла:
       ├─ aiIdentifyFile() — Claude `file_recognition` (5 c timeout)
       ├─ Успех → parseOSVFileWithHints() с hints
       │   ├─ Парсер сработал → success + parsedData.parsed + aiHints
       │   └─ Парсер упал → needs_ai_extraction
       └─ Ошибка AI → error + parseErrors

Клиент поллит POST /api/files/ai-extract-next  (по 1 файлу за вызов)
   └─ aiExtractData() — Claude `data_extraction` (9 c timeout, файлы > maxKB обрезаются)
       ├─ Валидация прошла → success + parsedData.aiParsed
       └─ Ошибка/невалидный JSON → error + parseErrors

GET /api/files/status — агрегированные счётчики по parseStatus для UI-полла
```

### 6.2. Конвейер анализа (обновлено в v3.2)

```
POST /api/analysis/run  (синхронно, без AI, ≤2 c)
   ├─ Пропускает файлы со статусом needs_ai_*  (будут учтены на следующем run)
   ├─ Для каждого файла: parsedData.parsed → parsedData.aiParsed → parseOSVFile(raw)
   ├─ runRulesEngine() → RuleCandidate[]  (только сигналы и числа)
   ├─ calculateMetrics() → AnalysisMetrics
   ├─ Создаёт analysis-results
   └─ Для каждого кандидата:
       ├─ AI-eligible (правило в aiRulesEnabledFor + aiRulesEnabled) →
       │   создаёт recommendation с fallback-текстом и aiEnhanced=false
       └─ Иначе → recommendation с шаблоном и aiEnhanced=true
   Возврат: { ok, analysisId, total, pendingAi, prefilled }

Клиент поллит POST /api/analysis/ai-enhance-batch  (по batchSize кандидатов)
   ├─ Берёт K новых рекомендаций с aiEnhanced=false (с cooldown 5 мин для упавших)
   ├─ Параллельно вызывает Claude по rule_<code> (15 c timeout каждая)
   ├─ Успех → updates title/description/shortRecommendation/fullText/priority + aiEnhanced=true
   └─ Ошибка → aiEnhanceFailedAt + aiEnhanceError, fallback-текст уже стоит
   Возврат: { done, processed, failed, remaining }

GET /api/analysis/status — { phase, total, enhanced, remaining, failed, done }
```

### 6.3. Правила и AI-обогащение

Все 9 правил остались (см. v2): ДЗ-1, ДЗ-2, ДЗ-3, КЗ-1, ЗАП-1, ЗАП-2, ПЛ-1, ФЦ-1, СВС-1.

**Контракт правила (v3.2):** правило возвращает `RuleCandidate[]` — детерминированно отобранные кандидаты с числами и сигналами, **без готового текста**. Текст генерится либо AI (если правило в `aiRulesEnabledFor`), либо статическим шаблоном из `fallback-templates.ts`.

**Миграционное состояние (Phase 1 пилот):** только `ДЗ-1` мигрировано на новый контракт. Остальные 8 правил продолжают возвращать готовые `GeneratedRecommendation`, которые engine оборачивает в «синтетические» кандидаты с маркером `__legacy__` — анализатор детектирует маркер и сразу подставляет готовый текст без обращения к AI.

**Приоритет AI-ответа capping:** AI может опустить приоритет рекомендации, но не имеет права поднять его более чем на 1 уровень выше `priorityHint` правила (защита от «потопа» инбокса).

### 6.4. AI-промпты (коллекция `ai-prompts`)

| promptKey | Назначение | Где используется |
|-----------|-----------|------------------|
| `file_recognition` (v2) | Извлечь `accountCode`, `period`, `documentType`, `columnFormat` из первых 50 строк файла | `/api/files/ai-recognize-batch` |
| `data_extraction` (v2) | Извлечь полный `ParsedAccountData` JSON по `accountCode`/`period`/`columnFormat` | `/api/files/ai-extract-next` |
| `recommendation_text` | Готовое деловое письмо (legacy, для ручного обогащения через `/api/analysis/ai-enhance`) | `/api/analysis/ai-enhance` |
| `enhance_recommendation` | Перепиши описание/рекомендацию/драфт под CEO-стиль (legacy) | `/api/analysis/ai-enhance` |
| `audit_working_capital` | 2-3 стратегические рекомендации за пределами правил | `/api/analysis/ai-audit` |
| `rule_dz1` (НОВОЕ) | Per-rule prompt для AI-обогащения кандидатов правила `ДЗ-1` | `/api/analysis/ai-enhance-batch` |
| `rule_<code>` (резерв) | По мере миграции правил Phase 2: `rule_dz2`, `rule_dz3`, `rule_kz1`, ... | `/api/analysis/ai-enhance-batch` |

**Сидинг:** `POST /api/ai/seed-prompts` (insert-only) или `POST /api/ai/seed-prompts?upsert=true` (overwrite + bump `version`). Делается из админки (кнопка «Seed AI Prompts») или вручную.

### 6.5. Защита от перерасхода и Vercel Hobby

| Endpoint | Per-call timeout (внутри функции) | Вписывается в 10 c Hobby? |
|----------|-----------------------------------|---------------------------|
| `/api/files/upload` (≤10 файлов) | — (без AI) | ✅ ~1.5 c |
| `/api/files/ai-recognize-batch` (2 файла) | 5 c × 2 параллельно | ✅ ~6 c |
| `/api/files/ai-extract-next` (1 файл) | 9 c | ✅ ~9 c |
| `/api/analysis/run` | — (без AI) | ✅ ~2 c |
| `/api/analysis/ai-enhance-batch` (3 кандидата) | 15 c в `Promise.race` | ✅ ~6-8 c |
| `/api/analysis/status` | — (count queries) | ✅ <500 ms |

**Стоимость:**
- AI-recognition: ~$0.005 на файл
- AI-extraction: ~$0.06-0.23 на файл (зависит от размера, обрезается до 100 КБ)
- AI-обогащение правила: ~$0.01 на кандидата

---

## 8. Логирование

Все типы событий из v2 + новые:

| eventType | Когда | payload |
|-----------|-------|---------|
| `access.request` | Запрос доступа | `{email}` |
| `access.approved` | Одобрение | `{email, inviteCode}` |
| `invite.used` | Использован код | `{code, email}` |
| `task.overdue` | Задача просрочена | `{recId, dueDate, amount}` |
| `task.due_date_changed` | Изменён срок | `{recId, oldDate, newDate}` |
| `onboarding.file_upload` | Загружен файл | `{fileName, accountCode, detected, parseStatus, deterministicParseOk}` (v3.2: добавлены `parseStatus` и флаг успеха детерминированного парса) |
| `ai.request` | Старт вызова Claude | `{promptKey, promptVersion, model}` |
| `ai.response` | Успешный ответ Claude | `{promptKey, promptVersion, model, inputTokens, outputTokens, durationMs, stage?}` |
| `ai.error` | Ошибка Claude или таймаут | `{promptKey, error, stage?}` (`stage` = `file_recognition` \| `data_extraction` для файлового конвейера) |

Все вызовы Claude дополнительно записываются в коллекцию `ai-usage-logs` (per-call токены и стоимость в USD), независимо от `event-log`.

---

## Приложение: список прототипов

| Экран | Mobile | Web |
|-------|--------|-----|
| Тизер-лендинг | `docs/prototype/teaser-landing.html` | (адаптивный) |
| Авторизация | `docs/prototype/auth-mobile.html` | `docs/prototype/auth-web.html` |
| Стартовый экран | `docs/prototype/start-mobile.html` | `docs/prototype/start-web.html` |
| Ожидание анализа | `docs/prototype/analysis-mobile.html` | `docs/prototype/analysis-web.html` |
| Входящие | `docs/prototype/inbox-mobile.html` | `docs/prototype/inbox-web.html` |
| Мои задачи | `docs/prototype/tasks-mobile.html` | `docs/prototype/tasks-web.html` |
