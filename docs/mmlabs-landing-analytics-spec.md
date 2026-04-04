# MMLabs AI-Advisor — Закрытый лендинг и аналитика

> **Когда реализовать:** после Итерации 8 (Inbox готов, демо-цикл работает end-to-end)
> **Зависимости:** Payload CMS с коллекциями, Google OAuth, работающий демо-режим
> **Внешний сервис:** PostHog Cloud (бесплатный план, до 1 млн событий/мес)

---

## Концепция

Продукт закрыт от публичного доступа до официального запуска. Каждый потенциальный пользователь получает индивидуальную ссылку вида:

```
https://site.com/?k=a7xm3wbf
```

- **Есть ключ** → полный лендинг с описанием продукта и кнопкой «Попробовать демо».
- **Нет ключа / невалидный ключ** → минимальная заглушка «Сервис в закрытом тестировании».

Все переходы и действия трекаются через PostHog.

---

## Часть 1: Коллекция InviteLinks

### Новая коллекция Payload CMS

**`src/collections/InviteLinks.ts`:**

| Поле | Тип | Описание |
|------|-----|----------|
| `key` | text, unique, readonly | Автогенерированный ключ (nanoid, 8 символов) |
| `recipientName` | text, required | Кому отправлена ссылка |
| `recipientEmail` | text, optional | Email получателя |
| `channel` | select: `telegram`, `whatsapp`, `email`, `linkedin`, `other` | Канал отправки |
| `note` | textarea, optional | Контекст: «встретились на конференции», «рекомендация от Иванова» |
| `status` | select: `active`, `expired`, `converted` | Статус ссылки |
| `openCount` | number, default 0, readonly | Количество переходов по ссылке |
| `firstOpenedAt` | date, optional, readonly | Дата/время первого перехода |
| `lastOpenedAt` | date, optional, readonly | Дата/время последнего перехода |
| `convertedToUser` | relationship → Users, optional | Пользователь, который зарегистрировался по этой ссылке |

**Access:** только admin (создание, чтение, редактирование).

### Генерация ключа

Хук `beforeChange` при создании записи:

```typescript
import { nanoid, customAlphabet } from 'nanoid';

// Алфавит без двусмысленных символов (0/o, 1/l, i/j)
const generateKey = customAlphabet('abcdefghkmnpqrstuvwxyz23456789', 8);
```

Ключ генерируется автоматически, в админке — readonly.

### Вычисляемое поле (virtual / admin UI)

В списке коллекции в админке показывать готовую ссылку:

```
https://{PAYLOAD_PUBLIC_SERVER_URL}/?k={key}
```

С кнопкой копирования (Payload Admin custom component или afterRead hook + admin description).

### Регистрация в Payload Config

Добавить `InviteLinks` в массив `collections` в `payload.config.ts`.

---

## Часть 2: Лендинг

### Маршрут

`src/app/(frontend)/page.tsx` — корневая страница `/`.

### Логика серверного компонента

```
1. Прочитать searchParams.k
2. Если k есть → lookup InviteLinks по key, где status === 'active'
   a. Найден → инкрементировать openCount, обновить lastOpenedAt
                (при первом открытии — заполнить firstOpenedAt)
              → рендерить полный лендинг
   b. Не найден / expired → рендерить заглушку
3. Если k нет → рендерить заглушку
```

### Заглушка (без ключа)

Минималистичная страница, центрированная по экрану:

- Логотип «AI-Advisor»
- Текст: «Сервис в закрытом тестировании»
- Кнопка «Запросить доступ» → ссылка на Telegram администратора (или mailto)
- Никакой конкретики о продукте

### Полный лендинг (с валидным ключом)

Mobile-first, одна страница со скроллом. Секции:

1. **Hero**
   - Заголовок: «AI-агент для управления оборотным капиталом»
   - Подзаголовок: 1-2 предложения о ценности (находит проблемы в финансах и предлагает готовые действия)
   - CTA-кнопка: «Попробовать на демо-данных» → `/auth?k={key}`

2. **Проблема** (What pain we solve)
   - 3 коротких блока: замороженные деньги, кассовые разрывы, когнитивный перегруз CEO
   - Иконки из Lucide React

3. **Как это работает** (How it works)
   - 3 шага: Подключение данных → AI-анализ → Готовые действия
   - Минимальные иллюстрации (иконки или простые SVG)

4. **Примеры рекомендаций**
   - 2-3 карточки-превью (визуально похожие на реальные карточки из Inbox)
   - «Токсичный должник», «Мёртвый неликвид», «Кит-убийца»

5. **CTA-блок**
   - Повторная кнопка «Попробовать на демо-данных»
   - Текст: «Демо на реальных бухгалтерских данных, без регистрации банковских карт»

### Адаптивность

| Элемент | Mobile (< 768px) | Tablet (768–1024px) | Desktop (> 1024px) |
|---------|-------------------|---------------------|---------------------|
| Контейнер | `w-full px-4` | `max-w-2xl mx-auto` | `max-w-5xl mx-auto` |
| Hero | Вертикальный стек | Вертикальный стек | Возможна 2-колоночная компоновка |
| Карточки-примеры | 1 колонка | 1 колонка | 3 в ряд |

### Передача ключа в auth

CTA-кнопка ведёт на `/auth?k={key}`. Страница авторизации:
- Сохраняет `key` в cookie `invite_key` (httpOnly: false, чтобы PostHog мог прочитать).
- После успешного OAuth callback:
  - Находит InviteLink по ключу из cookie.
  - Ставит `status: 'converted'`, `convertedToUser: user.id`.
  - Удаляет cookie.

---

## Часть 3: PostHog — подключение

### Установка

```bash
npm install posthog-js
```

### Инициализация

`src/lib/analytics/posthog.ts`:

```typescript
import posthog from 'posthog-js';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // управляем вручную
    capture_pageleave: true,
    persistence: 'localStorage',
  });
}

export { posthog };
```

### Provider

`src/components/PostHogProvider.tsx` (client):

```typescript
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, posthog } from '@/lib/analytics/posthog';

export function PostHogProvider({ children, inviteKey }: {
  children: React.ReactNode;
  inviteKey?: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    initPostHog();
    if (inviteKey) {
      posthog.register({ invite_key: inviteKey }); // super property
    }
  }, [inviteKey]);

  useEffect(() => {
    posthog.capture('$pageview', { path: pathname });
  }, [pathname]);

  return <>{children}</>;
}
```

Обернуть корневой layout в `<PostHogProvider>`.

### Переменные окружения

Добавить в `.env` и `.env.example`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Добавить в Vercel dashboard.

---

## Часть 4: Карта событий

### Воронка 1 — Привлечение (лендинг)

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `invite_link_opened` | Открытие ссылки с валидным ключом | `invite_key`, `referrer`, `device_type` |
| `landing_section_viewed` | Скролл до секции лендинга | `invite_key`, `section` (hero / problem / how_it_works / examples / cta) |
| `landing_cta_clicked` | Клик «Попробовать на демо-данных» | `invite_key`, `cta_location` (hero / bottom) |
| `landing_stub_viewed` | Открытие без ключа (заглушка) | `referrer`, `device_type` |
| `landing_access_requested` | Клик «Запросить доступ» на заглушке | `referrer` |

### Воронка 2 — Регистрация

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `auth_started` | Клик «Войти через Google» | `invite_key`, `mode` |
| `auth_completed` | Успешный OAuth callback | `invite_key`, `is_new_user`, `mode` |
| `auth_denied` | Email не в allowlist | `invite_key` |

### Воронка 3 — Демо-онбординг

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `onboarding_step_viewed` | Показ шага визарда | `step` (0–3), `step_name`, `mode` |
| `onboarding_step_completed` | Переход к следующему шагу | `step`, `step_name`, `duration_sec` |
| `onboarding_completed` | Финальный редирект на inbox | `mode`, `total_duration_sec`, `recommendation_count` |

### Воронка 4 — Работа с продуктом (демо)

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `page_viewed` | Открытие экрана приложения | `page` (inbox / tasks / data) |
| `financial_summary_expanded` | Клик «Подробнее» в финансовой сводке | — |
| `recommendation_viewed` | Карточка появилась во viewport | `rec_id`, `rule_code`, `priority` |
| `recommendation_action` | «Взять в работу» / «Отклонить» | `rec_id`, `rule_code`, `action` (accept / dismiss) |
| `recommendation_text_copied` | Скопирован текст рекомендации | `rec_id`, `rule_code` |
| `recommendation_feedback` | Оценка 👍/👎 или комментарий | `rec_id`, `rule_code`, `rating`, `has_comment` |
| `demo_file_viewed` | Открыл файл на экране «Данные» | `file_name`, `account_code` |
| `task_status_changed` | Смена статуса на экране «Задачи» | `rec_id`, `from_status`, `to_status` |

### Воронка 5 — Сессии

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `session_started` | Новый визит (автоматически PostHog) | `mode`, `session_number` |
| `logout` | Клик «Выйти» | `mode` |

### Зарезервировано для пре-прод (реализовать позже)

| Событие | Когда срабатывает | Свойства |
|---------|-------------------|----------|
| `file_uploaded` | Загрузка файла в пре-прод онбординге | `file_name`, `file_size`, `file_type` |
| `file_recognized` | AI распознал файл | `file_id`, `detected_type`, `account_code`, `confidence` |
| `file_parse_completed` | Файл успешно распарсен | `file_id`, `entity_count` |
| `file_parse_error` | Ошибка парсинга | `file_id`, `error` |
| `ai_audit_completed` | AI-аудит завершён | `recommendation_count`, `duration_sec` |
| `preprod_onboarding_step_viewed` | Шаг пре-прод визарда | `step`, `step_name` |
| `preprod_onboarding_completed` | Завершение пре-прод онбординга | `total_duration_sec`, `file_count`, `recommendation_count` |

---

## Часть 5: Реализация трекинга

### Где вызывать события

**На лендинге (серверный + клиентский компонент):**

- `invite_link_opened` — при рендере полного лендинга (серверная часть инкрементирует openCount, клиентская отправляет в PostHog).
- `landing_section_viewed` — Intersection Observer на каждой секции.
- `landing_cta_clicked` — onClick на CTA-кнопках.
- `landing_stub_viewed` — при рендере заглушки.

**На странице авторизации:**

- `auth_started` — onClick на кнопке «Войти через Google».
- `auth_completed` / `auth_denied` — в callback-обработчике OAuth (серверная часть отправляет через PostHog server-side SDK или клиент отправляет после редиректа).

**В компоненте онбординга (`OnboardingWizard`):**

- `onboarding_step_viewed` — в useEffect при смене `currentStep`.
- `onboarding_step_completed` — в обработчике кнопки перехода. Считать `duration_sec` как разницу между viewed и completed.

**В компонентах приложения:**

- `recommendation_viewed` — Intersection Observer на `RecommendationCard`.
- `recommendation_action` — в обработчиках кнопок «Взять в работу» / «Отклонить».
- `recommendation_text_copied` — в `CopyDraftButton`.
- `recommendation_feedback` — в `FeedbackSection`.

### Super properties (автоматически добавляются ко всем событиям)

```typescript
posthog.register({
  invite_key: inviteKey,  // из cookie, если есть
  user_mode: user?.mode,  // demo / preprod
  app_version: '0.1.0',
});
```

### Идентификация пользователя

После успешной авторизации:

```typescript
posthog.identify(user.id, {
  email: user.email,
  name: user.name,
  mode: user.mode,
  company: user.companyName,
});
```

---

## Часть 6: PostHog — дашборды

После подключения создать в PostHog Cloud следующие дашборды:

### Дашборд «Воронка привлечения»

- Воронка: `invite_link_opened` → `landing_cta_clicked` → `auth_completed` → `onboarding_completed`
- Разбивка по `invite_key` (кто из приглашённых дошёл до какого этапа)

### Дашборд «Вовлечённость демо»

- Среднее количество `recommendation_action` на пользователя
- % пользователей, которые скопировали хотя бы один текст (`recommendation_text_copied`)
- % пользователей, которые оставили хотя бы один feedback
- Среднее время сессии

### Дашборд «Инвайт-ссылки»

- Таблица: `invite_key` × `openCount` × конверсия в регистрацию
- Ключи с `openCount` > 3 (вероятно пересланные) — отдельный список

---

## Шаги реализации

### Шаг 1: Инфраструктура
1. Зарегистрироваться в PostHog Cloud, создать проект, получить API key.
2. Установить `posthog-js` и `nanoid`.
3. Создать коллекцию `InviteLinks` в Payload CMS.
4. Добавить env-переменные `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
5. Создать `PostHogProvider` и обернуть корневой layout.

### Шаг 2: Лендинг
6. Создать страницу-заглушку (`/` без ключа).
7. Создать полный лендинг (`/` с ключом).
8. Реализовать логику проверки ключа (серверный компонент).
9. Передача `invite_key` через cookie при переходе на `/auth`.

### Шаг 3: Трекинг лендинга
10. Трекинг `invite_link_opened`, `landing_stub_viewed`.
11. Intersection Observer для `landing_section_viewed`.
12. onClick для `landing_cta_clicked`.

### Шаг 4: Трекинг авторизации и онбординга
13. События `auth_*` на странице авторизации.
14. События `onboarding_*` в `OnboardingWizard`.
15. `posthog.identify()` после авторизации.

### Шаг 5: Трекинг продукта
16. Intersection Observer для `recommendation_viewed`.
17. События в `RecommendationCard`, `CopyDraftButton`, `FeedbackSection`.
18. События навигации и сессий.

### Шаг 6: Конвертация ссылок
19. Хук в коллекции Users: при создании нового пользователя — найти InviteLink по cookie, обновить `status: 'converted'`.
20. Проверка в Payload Admin: в списке InviteLinks видно, кто конвертировался.

### Шаг 7: Проверка и деплой
21. Пройти весь цикл: создать invite → открыть ссылку → лендинг → auth → онбординг → inbox.
22. Проверить события в PostHog Live Events.
23. Создать базовые дашборды.
24. Коммит и деплой.

---

## Критерий готовности

- [ ] Админ может создать invite-ссылку в `/admin` и скопировать готовый URL.
- [ ] Открытие ссылки с валидным ключом показывает полный лендинг.
- [ ] Открытие без ключа или с невалидным — показывает заглушку.
- [ ] `openCount` инкрементируется при каждом переходе.
- [ ] Все события из карты событий (Воронки 1–5) появляются в PostHog Live Events.
- [ ] После регистрации пользователя соответствующая InviteLink получает `status: 'converted'`.
- [ ] `invite_key` пробрасывается как super property ко всем событиям пользователя.
- [ ] Лендинг адаптивен на mobile / tablet / desktop.
- [ ] `npm run build` без ошибок, деплой в Vercel, проверка на production URL.
