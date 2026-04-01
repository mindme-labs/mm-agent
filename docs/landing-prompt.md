**CONTEXT:**
You are an expert Frontend Developer and UI/UX Designer creating a high-converting, enterprise-grade B2B SaaS landing page. 
The product is called "mmlabs" (money management labs). It is an AI-driven, proactive financial controller for B2B wholesale CEOs that integrates with their local accounting software (1C).
The tone of the product is a "soulless, precise robotic calculator" — strictly factual, mathematically accurate, and highly secure.

**TECH STACK:**
Use React, Tailwind CSS, and `lucide-react` for icons. 
Create a fully responsive, single-page landing page.

**DESIGN SYSTEM & THEME (Light Fintech):**
- **Vibe:** Clean, airy, strict, and highly professional. Think Stripe, Vercel, or modern banking apps. No 3D characters, no generic business photos. Use clean lines, geometric shapes, and UI mockups.
- **Backgrounds:** Primary `bg-white`, alternating sections with very light gray `bg-slate-50` or `bg-gray-50` to separate content.
- **Typography:** Sans-serif (Inter, Roboto, or standard system fonts). Clean and highly legible. Text color primary `text-slate-900`, secondary `text-slate-500`.
- **Accents (Buttons/Icons):** Deep trust-blue `bg-slate-900` or deep indigo `bg-indigo-600`.
- **Components:** Use soft shadows `shadow-sm` or `shadow-md` for cards. Buttons should have clean borders or solid dark fills.

**LAYOUT & CONTENT STRUCTURE (Use the exact Russian text provided):**

**1. Sticky Header (Navbar)**
- **Behavior:** Must be sticky at the top, `bg-white/80` with backdrop blur, `border-b border-gray-100`.
- **Logo (Left):** "mmlabs" (font-bold, text-xl) + a subtle sub-text "money management labs" (text-xs, text-gray-400).
- **Right side:** 
  - Link: "Вход в систему" (text-sm, font-medium, hover:text-indigo-600).
  - Button (Solid): "Подключить базу 1С" (text-sm, bg-slate-900 text-white rounded-md px-4 py-2).

**2. Hero Section**
- **Layout:** Centered, plenty of whitespace (`py-24`).
- **Overline/Badge:** "Закрытое бета-тестирование для оптовой B2B-торговли" (small text, uppercase tracking-wide, inside a subtle pill background).
- **H1:** "Финансовый контроллер, который никогда не спит." (text-5xl or 6xl, font-extrabold, tracking-tight, max-w-4xl mx-auto).
- **Subtitle:** "Проактивный алгоритм для управления оборотным капиталом от mmlabs. Интегрируется с вашей 1С за 5 минут. Не строит пассивные дашборды, а непрерывно сканирует данные, блокирует убыточные сделки и отправляет готовые управленческие решения прямо в ваш смартфон. Никаких таблиц и ИИ-галлюцинаций." (text-lg, text-slate-600, max-w-3xl mx-auto mt-6).
- **CTA Group (flex gap-4 justify-center mt-10):**
  - Primary Button: "Провести аудит базы 1С" (large, dark blue/slate-900).
  - Secondary Button: "Посмотреть примеры" (outline variant).

**3. Flowchart 1: Zero-Knowledge Architecture (Onboarding)**
- **Background:** `bg-slate-50 py-20`.
- **Header:** H2 "Zero-Knowledge интеграция за 5 минут." + Subtext "Мы не требуем доступа к вашим серверам, не открываем порты и не копируем коммерческую тайну. Система работает на базе локального скрипта."
- **Layout:** A horizontal 4-step grid (grid-cols-1 md:grid-cols-4) with connecting arrows or lines between them.
- **Cards (Step 1 to 4):**
  - Step 1: Icon (Download/Plugin). Title: "Локальный плагин (.epf)". Text: "Вы устанавливаете стандартную обработку в 1С. Режим работы — строго «Только чтение»."
  - Step 2: Icon (Shield/Mask). Title: "Анонимизация данных". Text: "Скрипт маскирует данные. ООО «Вектор» превращается в Client_44, а «Труба 50мм» — в Item_89."
  - Step 3: Icon (Lock/Server). Title: "Безопасный туннель". Text: "Обезличенный массив цифр передается на сервер аналитики mmlabs по зашифрованному протоколу."
  - Step 4: Icon (Smartphone/Key). Title: "Локальная дешифровка". Text: "Реальные названия восстанавливаются только на вашем устройстве с помощью локального ключа."

**4. Flowchart 2: Daily Operations Loop**
- **Background:** `bg-white py-20`.
- **Header:** H2 "Ежедневный алгоритм защиты капитала" + Subtext "Вам больше не нужно искать проблемы в отчетах. Алгоритм находит их сам и предлагает действие."
- **Layout:** A vertical timeline or a visually distinct step-by-step list.
- **Steps:**
  - Tag: "[ 03:00 ]" | Title: "Извлечение факта". Text: "Скрипт незаметно выгружает изменения за сутки: новые счета, банковские выписки, складские движения."
  - Tag: "[ 05:00 ]" | Title: "Выявление аномалий". Text: "Система прогоняет данные через 40+ финансовых триггеров: расчет ликвидности, контроль маржинальности, DSO."
  - Tag: "[ 08:30 ]" | Title: "Доставка решения". Text: "Вы получаете Push-уведомление. Внутри: точный расчет потери в рублях и сгенерированный проект документа."
  - Tag: "[ 08:35 ]" | Title: "Одно нажатие (Action)". Text: "Вы нажимаете «Одобрить / Переслать». Черновик отправляется бухгалтеру или контрагенту. Инцидент исчерпан."

**5. Use-Cases Section (UI Mockup Cards)**
- **Background:** `bg-slate-50 py-20`.
- **Header:** H2 "Математика управленческих решений" (centered).
- **Layout:** A grid of 3 application UI cards (`grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto`). These should look like actual software cards (white bg, shadow, border, with a distinct action button at the bottom of each).
- **Card 1:** 
  - Tag: "🔴 Cash Gap"
  - Title: "Прогноз дефицита ликвидности"
  - Content block 1 (Fact): "В четверг дефицит средств на ФОТ и налоги составит 940 000 руб."
  - Content block 2 (Logic): "Найдена запланированная выплата лояльному поставщику (Индекс 99%) на 1 000 000 руб."
  - Action Button (Full width): "[ Отправить запрос на отсрочку ]"
- **Card 2:**
  - Tag: "🟡 Margin Protection"
  - Title: "Блокировка убыточных сделок"
  - Content block 1 (Fact): "Менеджер Смирнов выставил счет на 800 000 руб. с маржой 4.2% (при норме 15%)."
  - Content block 2 (Logic): "Упущенная выгода: 86 400 руб. Алгоритм инициирует блокировку отгрузки."
  - Action Button (Full width): "[ Отправить протокол менеджеру ]"
- **Card 3:**
  - Tag: "🔵 DSO Control"
  - Title: "Контроль стоимости дебиторки"
  - Content block 1 (Fact): "ПАО Монополия: просрочка 1 день на сумму 2.5 млн руб."
  - Content block 2 (Logic): "Стоимость замороженного капитала: 1 370 руб./сутки. Бесплатное кредитование недопустимо."
  - Action Button (Full width): "[ Отправить акт сверки с пенями ]"

**6. Bottom CTA (Call to Action)**
- **Layout:** A clean, wide banner/box at the bottom (`max-w-4xl mx-auto bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm my-20`).
- **H2:** "Инициализация контроллера mmlabs"
- **Text:** "Подключите обработчик к своей 1С за 5 минут и получите первичный срез за 24 часа. Завтра утром вы увидите точную сумму «мертвого» капитала и 3-5 готовых решений по возврату денег в оборот."
- **Primary Button:** "Запросить скрипт интеграции (.epf)" (large, bg-slate-900 text-white).
- **Footer Text:** "© 2024 mmlabs. Money Management Labs. Конфиденциально и безопасно."

**RULES:**
- STRICTLY use the provided Russian texts for the UI. Do not translate them to English. 
- Ensure high contrast and accessibility. 
- Make it look like a highly polished, expensive B2B SaaS product.
- Do not add any generic placeholder text (Lorem Ipsum).
- Output the fully functional React component using Tailwind CSS.