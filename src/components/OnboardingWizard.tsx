'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const HOW_IT_WORKS = [
  {
    n: '1',
    title: 'Выгрузите ОСВ из 1С',
    text: 'Стандартные оборотно-сальдовые ведомости в CSV. Формируются за 2 минуты в любой версии 1С:Бухгалтерии.',
  },
  {
    n: '2',
    title: 'AI анализирует данные',
    text: '9 типов проверок: дебиторка, склад, кредиторы, маржинальность, платёжные циклы. Занимает 30–60 секунд.',
    demo: true,
  },
  {
    n: '3',
    title: 'Получите рекомендации',
    text: 'Конкретные действия с суммами из ваших данных и оценкой финансового эффекта.',
  },
  {
    n: '4',
    title: 'Действуйте',
    text: 'Готовые тексты писем и офферов с данными ваших контрагентов. Скопируйте и отправьте — без редактирования.',
  },
]

const ANALYSIS_STAGES = [
  'Распознавание файлов',
  'Извлечение данных',
  'Расчёт метрик',
  'Проверка правил',
  'Формирование рекомендаций',
]

const ACCOUNTS = [
  { code: 'сч. 10', name: 'Материалы' },
  { code: 'сч. 41', name: 'Товары' },
  { code: 'сч. 45', name: 'Отгруженные' },
  { code: 'сч. 60', name: 'Поставщики' },
  { code: 'сч. 62', name: 'Покупатели' },
  { code: '90.01', name: 'Выручка' },
  { code: '90.02', name: 'Себестоимость' },
]

interface DemoFile {
  name: string
  size: string
}

const DEMO_FILES: DemoFile[] = [
  { name: 'ОСВ сч.10 2025.csv', size: '42 КБ' },
  { name: 'ОСВ сч.41 2025.csv', size: '118 КБ' },
  { name: 'ОСВ сч.62 2025.csv', size: '76 КБ' },
]

// ─── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ onBegin }: { onBegin: () => void }) {
  const [files, setFiles] = useState<DemoFile[]>([])
  const [carIdx, setCarIdx] = useState(0)
  const carRef = useRef<HTMLDivElement>(null)

  const addDemoFiles = () => {
    if (files.length === 0) setFiles(DEMO_FILES)
  }

  const handleScroll = () => {
    if (!carRef.current) return
    const idx = Math.round(carRef.current.scrollLeft / 230)
    setCarIdx(idx)
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
      {/* Mobile layout */}
      <div className="lg:hidden">
        <div className="px-5 pb-24 pt-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ color: 'var(--mm-green)', background: 'var(--mm-green-bg)', borderColor: 'rgba(15,123,92,.18)' }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--mm-green)' }} />
            Триал · 7 дней
          </div>
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
            Добро пожаловать!
          </h1>
          <p className="mb-7 text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
            Загрузите данные из 1С — через минуту получите рекомендации по оборотному капиталу.
          </p>

          {/* Carousel */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-green)' }}>
            Как это работает
          </div>
          <div ref={carRef} onScroll={handleScroll}
            className="flex gap-2.5 overflow-x-auto pb-1"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {HOW_IT_WORKS.map((item) => (
              <div key={item.n}
                className="min-w-[220px] max-w-[260px] shrink-0 rounded-xl border p-4"
                style={{ scrollSnapAlign: 'start', background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                  style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)', border: '1px solid rgba(15,123,92,.12)' }}>
                  {item.n}
                </div>
                <h3 className="mb-1 text-sm font-bold" style={{ color: 'var(--mm-ink)' }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>{item.text}</p>
                {item.demo && (
                  <div className="mt-2 rounded-md p-2 text-xs" style={{ background: 'var(--mm-bg)', border: '1px solid var(--mm-border)' }}>
                    <span className="mb-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>Критично</span>
                    <div className="text-xs font-semibold" style={{ color: 'var(--mm-ink)' }}>ООО «Вектор» — 38% ДЗ</div>
                    <div className="text-[10px]" style={{ color: 'var(--mm-muted)' }}>₽4.5M под риском</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mb-7 mt-2.5 flex justify-center gap-1.5">
            {HOW_IT_WORKS.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{ background: i === carIdx ? 'var(--mm-green)' : 'var(--mm-border)' }} />
            ))}
          </div>

          {/* Upload */}
          <div className="mb-1 text-base font-bold" style={{ color: 'var(--mm-ink)' }}>Загрузите файлы</div>
          <div className="mb-3 text-sm" style={{ color: 'var(--mm-ink2)' }}>ОСВ из 1С:Бухгалтерии в CSV</div>
          <div
            onClick={addDemoFiles}
            className="mb-3 cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors"
            style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)' }}>
            <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--mm-green-bg)' }}>
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M16 10v12M10 16l6-6 6 6" stroke="var(--mm-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mb-1 text-sm font-bold" style={{ color: 'var(--mm-ink)' }}>Выберите файлы</div>
            <div className="mb-3 text-xs" style={{ color: 'var(--mm-muted)' }}>или перетащите сюда</div>
            <button className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--mm-green)' }}>
              Выбрать файлы
            </button>
            <div className="mt-2 text-xs" style={{ color: 'var(--mm-muted)' }}>CSV / Excel · до 10 файлов · до 10 Мб</div>
          </div>

          {files.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-2.5 rounded-lg border p-2.5"
                  style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ background: 'var(--mm-green-bg)' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M4 1h5.5L13 5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
                        stroke="var(--mm-green)" strokeWidth="1.3" fill="none" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold" style={{ color: 'var(--mm-ink)' }}>{f.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--mm-muted)' }}>{f.size}</div>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }}>Готов</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onBegin}
            disabled={files.length === 0}
            className="w-full rounded-lg py-4 text-sm font-semibold text-white transition-opacity disabled:cursor-default disabled:opacity-40"
            style={{ background: files.length > 0 ? 'var(--mm-green)' : 'var(--mm-border)', color: files.length > 0 ? '#fff' : 'var(--mm-muted)' }}>
            Начать анализ
          </button>

          <details className="mt-4 rounded-xl border" style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold"
              style={{ color: 'var(--mm-ink)' }}>
              Какие счета загрузить?
              <span style={{ color: 'var(--mm-muted)' }}>+</span>
            </summary>
            <div className="grid grid-cols-2 gap-1 px-4 pb-4">
              {ACCOUNTS.map((a) => (
                <div key={a.code} className="flex gap-2 rounded p-1.5 text-xs"
                  style={{ background: 'var(--mm-bg)' }}>
                  <b style={{ color: 'var(--mm-green)', minWidth: 38 }}>{a.code}</b>
                  <span style={{ color: 'var(--mm-ink2)' }}>{a.name}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1100px] px-14 pb-16 pt-12">
          {/* Welcome */}
          <div className="mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold"
              style={{ color: 'var(--mm-green)', background: 'var(--mm-green-bg)', borderColor: 'rgba(15,123,92,.18)' }}>
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--mm-green)' }} />
              Триал · 7 дней
            </div>
            <h1 className="mb-3 text-4xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.03em' }}>
              Добро пожаловать!
            </h1>
            <p className="max-w-lg text-lg leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
              Загрузите данные из 1С — через минуту получите рекомендации по управлению оборотным капиталом.
            </p>
          </div>

          {/* How it works */}
          <div className="mb-14">
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--mm-green)' }}>
              Как это работает
            </div>
            <div className="grid grid-cols-2 gap-4">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.n} className="rounded-2xl border p-7 transition-colors hover:border-[rgba(15,123,92,.25)]"
                  style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                  <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)', border: '1px solid rgba(15,123,92,.12)' }}>
                    {item.n}
                  </div>
                  <h3 className="mb-1.5 text-lg font-bold" style={{ color: 'var(--mm-ink)' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>{item.text}</p>
                  {item.demo && (
                    <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--mm-bg)', border: '1px solid var(--mm-border)' }}>
                      <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>Критично</span>
                      <div className="text-sm font-semibold" style={{ color: 'var(--mm-ink)' }}>ООО «Вектор» — 38% дебиторки</div>
                      <div className="text-xs" style={{ color: 'var(--mm-muted)' }}>₽4.5M под риском невозврата</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upload section */}
          <div>
            <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
              Загрузите файлы для анализа
            </h2>
            <p className="mb-5 text-base" style={{ color: 'var(--mm-ink2)' }}>
              Оборотно-сальдовые ведомости из 1С:Бухгалтерии в формате CSV
            </p>
            <div className="grid gap-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
              <div>
                <div
                  onClick={addDemoFiles}
                  className="cursor-pointer rounded-2xl border-[2.5px] border-dashed px-8 py-14 text-center transition-colors hover:border-[var(--mm-green)] hover:bg-[var(--mm-green-bg)]"
                  style={{ borderColor: 'var(--mm-border)', background: 'var(--mm-white)' }}>
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: 'var(--mm-green-bg)' }}>
                    <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
                      <path d="M22 14v16M14 22l8-8 8 8" stroke="var(--mm-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="mb-1.5 text-xl font-bold" style={{ color: 'var(--mm-ink)' }}>Перетащите файлы сюда</h3>
                  <p className="mb-5 text-base" style={{ color: 'var(--mm-muted)' }}>или выберите через проводник</p>
                  <button className="inline-flex items-center gap-1.5 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--mm-green)' }}>
                    Выбрать файлы
                  </button>
                  <div className="mt-3.5 text-sm" style={{ color: 'var(--mm-muted)' }}>CSV или Excel · до 10 файлов · до 10 Мб суммарно</div>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 flex flex-col gap-1.5">
                    {files.map((f) => (
                      <div key={f.name} className="flex items-center gap-3 rounded-xl border p-3"
                        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: 'var(--mm-green-bg)' }}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4 1h5.5L13 5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
                              stroke="var(--mm-green)" strokeWidth="1.3" fill="none" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" style={{ color: 'var(--mm-ink)' }}>{f.name}</div>
                          <div className="text-xs" style={{ color: 'var(--mm-muted)' }}>{f.size}</div>
                        </div>
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ background: 'var(--mm-green-bg)', color: 'var(--mm-green)' }}>Готов</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={onBegin}
                  disabled={files.length === 0}
                  className="mt-3.5 w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                  style={{ background: files.length > 0 ? 'var(--mm-green)' : 'var(--mm-border)' }}>
                  Начать анализ
                </button>
              </div>

              {/* Accounts sidebar */}
              <div className="rounded-2xl border p-6" style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                <div className="mb-4 text-base font-bold" style={{ color: 'var(--mm-ink)' }}>Какие счета загрузить</div>
                <div className="flex flex-col gap-1.5">
                  {ACCOUNTS.map((a) => (
                    <div key={a.code} className="flex gap-2.5 rounded-lg px-3 py-2 text-sm"
                      style={{ background: 'var(--mm-bg)' }}>
                      <b className="min-w-[52px]" style={{ color: 'var(--mm-green)' }}>{a.code}</b>
                      <span style={{ color: 'var(--mm-ink2)' }}>{a.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Analysis Screen ────────────────────────────────────────────────────────

interface AnalysisScreenProps {
  onComplete: (count: number) => void
  onCancel: () => void
}

function AnalysisScreen({ onComplete, onCancel }: AnalysisScreenProps) {
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const [recommendationCount, setRecommendationCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const progress = done ? 100 : Math.round(((current + 1) / ANALYSIS_STAGES.length) * 100)

  useEffect(() => {
    if (running.current) return
    running.current = true

    const run = async () => {
      for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
        setCurrent(i)

        if (i === ANALYSIS_STAGES.length - 1) {
          try {
            const res = await fetch('/api/demo/seed', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Seed failed')
            setRecommendationCount(data.recommendationCount)
          } catch (err) {
            setError((err as Error).message)
            running.current = false
            return
          }
        } else {
          await new Promise(r => setTimeout(r, 1400))
        }
      }

      await new Promise(r => setTimeout(r, 400))
      setDone(true)
    }

    run()
  }, [])

  const handleGoToResults = useCallback(() => {
    onComplete(recommendationCount)
  }, [onComplete, recommendationCount])

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--mm-bg)' }}>
      {/* Mobile */}
      <div className="flex w-full flex-col items-center justify-center px-6 pb-16 pt-6 lg:hidden">
        <div className="w-full max-w-sm text-center">
          {!done ? (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: 'var(--mm-green-bg)', border: '2px solid rgba(15,123,92,.18)', animation: 'mmPulse 2s ease-in-out infinite' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                    stroke="var(--mm-green)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="mb-1.5 text-xl font-extrabold" style={{ color: 'var(--mm-ink)' }}>Анализируем данные</h1>
              <p className="mb-7 text-sm" style={{ color: 'var(--mm-muted)' }}>Около минуты. Не закрывайте страницу.</p>

              <div className="mb-6 h-1 w-full overflow-hidden rounded-full" style={{ background: 'var(--mm-border)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--mm-green)' }} />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                {ANALYSIS_STAGES.map((label, i) => {
                  const isDone = i < current
                  const isOn = i === current
                  return (
                    <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-all"
                      style={{
                        background: isDone ? 'var(--mm-green-bg)' : isOn ? 'var(--mm-white)' : 'transparent',
                        border: isOn ? '1px solid var(--mm-border)' : '1px solid transparent',
                        opacity: !isDone && !isOn ? 0.3 : 1,
                      }}>
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: isDone ? 'var(--mm-green)' : isOn ? 'var(--mm-green-bg)' : 'transparent' }}>
                        {isDone ? (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2.5 5l2 2L7.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        ) : isOn ? (
                          <div className="h-2 w-2 rounded-full" style={{ background: 'var(--mm-green)', animation: 'spin 1.2s linear infinite' }} />
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold"
                        style={{ color: isDone ? 'var(--mm-green)' : isOn ? 'var(--mm-ink)' : 'var(--mm-muted)' }}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {error && (
                <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>
                  {error}
                </div>
              )}

              <button onClick={onCancel} className="mt-6 text-xs underline" style={{ color: 'var(--mm-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Отменить
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'var(--mm-green)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mb-1.5 text-xl font-extrabold" style={{ color: 'var(--mm-ink)' }}>Анализ завершён</h2>
              <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>Найдены возможности, требующие вашего внимания.</p>
              <div className="mb-6 flex justify-center gap-4">
                <div className="min-w-[100px] rounded-xl border p-4 text-center"
                  style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                  <div className="text-2xl font-extrabold leading-none" style={{ color: 'var(--mm-green)' }}>{recommendationCount}</div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--mm-muted)' }}>рекомендаций</div>
                </div>
              </div>
              <button
                onClick={handleGoToResults}
                className="w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--mm-green)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Перейти к рекомендациям →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: split layout */}
      <div className="hidden w-full lg:flex">
        {/* Left — dark panel */}
        <div className="relative flex w-1/2 flex-col justify-center px-16 py-16" style={{ background: 'var(--mm-ink)' }}>
          <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight text-white" style={{ letterSpacing: '-.03em' }}>
            {done ? 'Готово!' : 'Анализируем\nваши данные'}
          </h1>
          <p className="mb-10 max-w-sm text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>
            {done
              ? 'Рекомендации сформированы. Переходите к результатам.'
              : 'Проверяем 9 типов рисков, рассчитываем метрики, формируем рекомендации. Это займёт около минуты.'}
          </p>

          {!done && (
            <div className="flex flex-col gap-2">
              {ANALYSIS_STAGES.map((label, i) => {
                const isDone = i < current
                const isOn = i === current
                return (
                  <div key={i} className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-all"
                    style={{
                      background: isDone ? 'rgba(52,211,153,.1)' : isOn ? 'rgba(255,255,255,.06)' : 'transparent',
                      border: isOn ? '1px solid rgba(255,255,255,.08)' : '1px solid transparent',
                      opacity: !isDone && !isOn ? 0.25 : 1,
                    }}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ background: isDone ? '#34D399' : isOn ? 'rgba(52,211,153,.15)' : 'transparent' }}>
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M4 7l2.5 2.5L10 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : isOn ? (
                        <div className="h-3 w-3 rounded-full border-2" style={{ borderColor: '#34D399', animation: 'spin 1.2s linear infinite' }} />
                      ) : null}
                    </div>
                    <span className="text-base font-semibold"
                      style={{ color: isDone ? '#34D399' : isOn ? '#fff' : 'rgba(255,255,255,.4)' }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {!done && (
            <button onClick={onCancel}
              className="absolute bottom-8 left-10 text-sm underline"
              style={{ color: 'rgba(255,255,255,.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Отменить и вернуться к загрузке
            </button>
          )}
        </div>

        {/* Right — progress */}
        <div className="flex w-1/2 items-center justify-center px-16">
          {!done ? (
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: 'var(--mm-green-bg)', border: '2px solid rgba(15,123,92,.18)', animation: 'mmPulse 2s ease-in-out infinite' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                    stroke="var(--mm-green)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="mb-1 text-base font-bold" style={{ color: 'var(--mm-green)' }}>{progress}%</div>
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--mm-border)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--mm-green)' }} />
              </div>
              <div className="text-sm" style={{ color: 'var(--mm-muted)' }}>Не закрывайте страницу</div>
            </div>
          ) : (
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: 'var(--mm-green)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mb-2.5 text-3xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
                Анализ завершён
              </h2>
              <p className="mb-8 text-lg leading-relaxed" style={{ color: 'var(--mm-ink2)' }}>
                Найдены возможности, требующие вашего внимания.
              </p>
              <div className="mb-8 flex justify-center gap-4">
                <div className="min-w-[120px] rounded-xl border p-5 text-center"
                  style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                  <div className="text-3xl font-extrabold leading-none" style={{ color: 'var(--mm-green)' }}>
                    {recommendationCount}
                  </div>
                  <div className="mt-1.5 text-sm" style={{ color: 'var(--mm-muted)' }}>рекомендаций</div>
                </div>
              </div>
              <button
                onClick={handleGoToResults}
                className="w-full rounded-xl py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--mm-green)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Перейти к рекомендациям →
              </button>
              <p className="mt-3 text-sm" style={{ color: 'var(--mm-muted)' }}>
                Рекомендации с конкретными суммами и готовыми текстами
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState<'start' | 'analysis' | 'done'>('start')
  const [recCount, setRecCount] = useState(0)

  const handleAnalysisComplete = useCallback(async (count: number) => {
    setRecCount(count)
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } catch {
      // best effort
    }
    window.location.href = '/app/inbox'
  }, [])

  if (step === 'analysis') {
    return (
      <AnalysisScreen
        onComplete={handleAnalysisComplete}
        onCancel={() => setStep('start')}
      />
    )
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--mm-bg)' }}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--mm-green)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--mm-ink)' }}>
            Найдено {recCount} рекомендаций. Переходим...
          </p>
        </div>
      </div>
    )
  }

  return (
    <StartScreen onBegin={() => setStep('analysis')} />
  )
}
