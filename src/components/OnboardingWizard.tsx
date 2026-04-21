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
  'AI-распознавание файлов',
  'AI-извлечение данных',
  'Расчёт метрик',
  'Проверка правил',
  'Формирование рекомендаций',
]

const STAGE_RECOGNITION = 0
const STAGE_EXTRACTION = 1
const STAGE_METRICS = 2
const STAGE_RULES = 3
const STAGE_AI_ENHANCE = 4

const ACCOUNTS = [
  { code: 'сч. 10', name: 'Материалы' },
  { code: 'сч. 41', name: 'Товары' },
  { code: 'сч. 45', name: 'Отгруженные' },
  { code: 'сч. 60', name: 'Поставщики' },
  { code: 'сч. 62', name: 'Покупатели' },
  { code: '90.01', name: 'Выручка' },
  { code: '90.02', name: 'Себестоимость' },
]

interface UploadedFile {
  file: File
  name: string
  size: string
  status: 'pending' | 'uploading' | 'success' | 'warning' | 'error'
  accountCode?: string
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  return `${Math.round(bytes / 1024)} КБ`
}

const FILE_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Готов', bg: 'var(--mm-green-bg)', color: 'var(--mm-green)' },
  uploading: { label: 'Загрузка...', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  success: { label: 'Готов', bg: 'var(--mm-green-bg)', color: 'var(--mm-green)' },
  needs_ai_recognition: { label: 'AI-распознавание', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  warning: { label: 'Не распознан', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  error: { label: 'Ошибка', bg: 'var(--mm-red-bg)', color: 'var(--mm-red)' },
}

interface StageProgressData {
  recommendationCount: number
  enhancedCount: number
  filesNeedingAi: number
  filesRecovered: number
  filesNeedingExtraction: number
  filesExtracted: number
}

function stageLabelWithProgress(
  label: string,
  stageIndex: number,
  d: StageProgressData,
  isActive: boolean,
): string {
  if (!isActive) return label
  if (stageIndex === STAGE_RECOGNITION && d.filesNeedingAi > 0) {
    return `${label} · ${d.filesRecovered} из ${d.filesNeedingAi}`
  }
  if (stageIndex === STAGE_EXTRACTION && d.filesNeedingExtraction > 0) {
    return `${label} · ${d.filesExtracted} из ${d.filesNeedingExtraction}`
  }
  if (stageIndex === STAGE_AI_ENHANCE && d.recommendationCount > 0) {
    return `${label} · ${d.enhancedCount} из ${d.recommendationCount}`
  }
  return label
}

// ─── Start Screen ──────────────────────────────────────────────────────────────

function StartScreen({ onBegin }: { onBegin: (useDemo: boolean) => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [carIdx, setCarIdx] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const carRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
      .filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase()
        return ext && ['csv', 'xlsx', 'xls'].includes(ext)
      })
      .map(f => ({
        file: f,
        name: f.name,
        size: formatSize(f.size),
        status: 'pending' as const,
      }))

    if (newFiles.length === 0) {
      setUploadError('Поддерживаются только CSV и Excel файлы')
      return
    }

    setUploadError('')
    setFiles(prev => {
      const combined = [...prev, ...newFiles]
      return combined.slice(0, 10)
    })
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUploadAndBegin = async () => {
    if (files.length === 0) return
    setUploading(true)
    setUploadError('')
    setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })))

    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f.file))

      const res = await fetch('/api/files/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error || 'Ошибка загрузки')
        setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })))
        setUploading(false)
        return
      }

      setFiles(prev => prev.map((f, i) => ({
        ...f,
        status: (data.files[i]?.status || 'success') as UploadedFile['status'],
        accountCode: data.files[i]?.accountCode ?? undefined,
      })))

      onBegin(false)
    } catch {
      setUploadError('Сетевая ошибка. Проверьте подключение.')
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })))
      setUploading(false)
    }
  }

  const handleScroll = () => {
    if (!carRef.current) return
    const idx = Math.round(carRef.current.scrollLeft / 230)
    setCarIdx(idx)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const uploadArea = (mobile: boolean) => (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`cursor-pointer rounded-${mobile ? 'xl' : '2xl'} border-${mobile ? '2' : '[2.5px]'} border-dashed ${mobile ? 'px-4 py-8' : 'px-8 py-14'} text-center transition-colors`}
      style={{
        borderColor: dragOver ? 'var(--mm-green)' : 'var(--mm-border)',
        background: dragOver ? 'var(--mm-green-bg)' : 'var(--mm-white)',
      }}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
      />
      <div className={`mx-auto ${mobile ? 'mb-3' : 'mb-4'} flex ${mobile ? 'h-8 w-8' : 'h-11 w-11'} items-center justify-center rounded-${mobile ? 'lg' : 'xl'}`}
        style={{ background: 'var(--mm-green-bg)' }}>
        <svg width={mobile ? '16' : '22'} height={mobile ? '16' : '22'} viewBox="0 0 44 44" fill="none">
          <path d="M22 14v16M14 22l8-8 8 8" stroke="var(--mm-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className={`mb-1 ${mobile ? 'text-sm' : 'text-xl'} font-bold`} style={{ color: 'var(--mm-ink)' }}>
        {mobile ? 'Выберите файлы' : 'Перетащите файлы сюда'}
      </div>
      <p className={`${mobile ? 'mb-3 text-xs' : 'mb-5 text-base'}`} style={{ color: 'var(--mm-muted)' }}>
        {mobile ? 'или перетащите сюда' : 'или выберите через проводник'}
      </p>
      <button className={`inline-flex items-center gap-1.5 rounded-${mobile ? 'lg' : 'xl'} ${mobile ? 'px-5 py-2.5 text-sm' : 'px-8 py-3.5 text-base'} font-semibold text-white transition-opacity hover:opacity-90`}
        style={{ background: 'var(--mm-green)' }}>
        Выбрать файлы
      </button>
      <div className={`${mobile ? 'mt-2 text-xs' : 'mt-3.5 text-sm'}`} style={{ color: 'var(--mm-muted)' }}>
        CSV или Excel · до 10 файлов · до 10 Мб
      </div>
    </div>
  )

  const fileList = (mobile: boolean) => files.length > 0 && (
    <div className={`${mobile ? 'mb-3' : 'mt-4'} flex flex-col gap-1.5`}>
      {files.map((f, i) => {
        const st = FILE_STATUS_CONFIG[f.status]
        return (
          <div key={`${f.name}-${i}`} className={`flex items-center gap-${mobile ? '2.5' : '3'} rounded-${mobile ? 'lg' : 'xl'} border ${mobile ? 'p-2.5' : 'p-3'}`}
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <div className={`flex ${mobile ? 'h-7 w-7' : 'h-8 w-8'} shrink-0 items-center justify-center rounded-${mobile ? 'md' : 'lg'}`}
              style={{ background: 'var(--mm-green-bg)' }}>
              <svg width={mobile ? '14' : '16'} height={mobile ? '14' : '16'} viewBox="0 0 16 16" fill="none">
                <path d="M4 1h5.5L13 5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
                  stroke="var(--mm-green)" strokeWidth="1.3" fill="none" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`truncate ${mobile ? 'text-xs' : 'text-sm'} font-semibold`} style={{ color: 'var(--mm-ink)' }}>
                {f.name}
              </div>
              <div className={`${mobile ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--mm-muted)' }}>
                {f.size}{f.accountCode ? ` · сч. ${f.accountCode}` : ''}
              </div>
            </div>
            <span className={`rounded-full ${mobile ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} font-semibold`}
              style={{ background: st.bg, color: st.color }}>
              {st.label}
            </span>
            {f.status !== 'uploading' && (
              <button onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs transition-colors hover:bg-[var(--mm-red-bg)]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-muted)' }}>
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

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
              </div>
            ))}
          </div>
          <div className="mb-7 mt-2.5 flex justify-center gap-1.5">
            {HOW_IT_WORKS.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full transition-colors"
                style={{ background: i === carIdx ? 'var(--mm-green)' : 'var(--mm-border)' }} />
            ))}
          </div>

          <div className="mb-1 text-base font-bold" style={{ color: 'var(--mm-ink)' }}>Загрузите файлы</div>
          <div className="mb-3 text-sm" style={{ color: 'var(--mm-ink2)' }}>ОСВ из 1С:Бухгалтерии в CSV</div>
          {uploadArea(true)}
          {fileList(true)}

          {uploadError && (
            <div className="my-2 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>
              {uploadError}
            </div>
          )}

          <button
            onClick={handleUploadAndBegin}
            disabled={files.length === 0 || uploading}
            className="mt-3 w-full rounded-lg py-4 text-sm font-semibold text-white transition-opacity disabled:cursor-default disabled:opacity-40"
            style={{ background: files.length > 0 ? 'var(--mm-green)' : 'var(--mm-border)', color: files.length > 0 ? '#fff' : 'var(--mm-muted)' }}>
            {uploading ? 'Загрузка...' : 'Начать анализ'}
          </button>

          <div className="mt-3 text-center">
            <button onClick={() => onBegin(true)}
              className="text-xs font-medium underline"
              style={{ color: 'var(--mm-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Попробовать на демо-данных
            </button>
          </div>

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
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight" style={{ color: 'var(--mm-ink)', letterSpacing: '-.02em' }}>
              Загрузите файлы для анализа
            </h2>
            <p className="mb-5 text-base" style={{ color: 'var(--mm-ink2)' }}>
              Оборотно-сальдовые ведомости из 1С:Бухгалтерии в формате CSV
            </p>
            <div className="grid gap-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
              <div>
                {uploadArea(false)}
                {fileList(false)}

                {uploadError && (
                  <div className="mt-2 rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--mm-red-bg)', color: 'var(--mm-red)' }}>
                    {uploadError}
                  </div>
                )}

                <button
                  onClick={handleUploadAndBegin}
                  disabled={files.length === 0 || uploading}
                  className="mt-3.5 w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                  style={{ background: files.length > 0 ? 'var(--mm-green)' : 'var(--mm-border)' }}>
                  {uploading ? 'Загрузка файлов...' : 'Начать анализ'}
                </button>

                <div className="mt-3 text-center">
                  <button onClick={() => onBegin(true)}
                    className="text-sm font-medium underline"
                    style={{ color: 'var(--mm-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Или попробовать на демо-данных
                  </button>
                </div>
              </div>

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
  useDemo: boolean
  onComplete: (count: number) => void
  onCancel: () => void
}

async function safeFetch(url: string, opts?: RequestInit): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, opts)
    const data = await res.json()
    return { ok: res.ok, data }
  } catch (err) {
    return { ok: false, data: { error: err instanceof Error ? err.message : 'Сетевая ошибка' } }
  }
}

function AnalysisScreen({ useDemo, onComplete, onCancel }: AnalysisScreenProps) {
  const [current, setCurrent] = useState(0)
  const [done, setDone] = useState(false)
  const [recommendationCount, setRecommendationCount] = useState(0)
  const [enhancedCount, setEnhancedCount] = useState(0)
  const [filesNeedingAi, setFilesNeedingAi] = useState(0)
  const [filesRecovered, setFilesRecovered] = useState(0)
  const [filesNeedingExtraction, setFilesNeedingExtraction] = useState(0)
  const [filesExtracted, setFilesExtracted] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)

  const visibleStages = useDemo
    ? ANALYSIS_STAGES.slice(STAGE_METRICS) // demo skips file recognition / extraction
    : ANALYSIS_STAGES
  const visibleStagesCount = visibleStages.length
  const indexOffset = useDemo ? STAGE_METRICS : 0
  const visibleCurrent = current - indexOffset
  const progress = done ? 100 : Math.round(((Math.min(visibleCurrent + 1, visibleStagesCount)) / visibleStagesCount) * 100)

  useEffect(() => {
    if (running.current) return
    running.current = true

    const run = async () => {
      // === Demo path: skip file recognition/extraction ===
      if (useDemo) {
        setCurrent(STAGE_METRICS)
        await new Promise(r => setTimeout(r, 800))
        setCurrent(STAGE_RULES)

        const { ok, data } = await safeFetch('/api/demo/seed', { method: 'POST' })
        if (!ok) {
          setError((data.error as string) || 'Ошибка анализа')
          running.current = false
          return
        }
        setRecommendationCount((data.recommendationCount as number) ?? (data.total as number) ?? 0)
        setCurrent(STAGE_AI_ENHANCE + 1)
        await new Promise(r => setTimeout(r, 300))
        setDone(true)
        return
      }

      // === Real path: file recognition (Phase 1) ===
      const initialStatus = await safeFetch('/api/files/status')
      if (initialStatus.ok) {
        const needsRec = (initialStatus.data.needsRecognition as number) ?? 0
        const needsExt = (initialStatus.data.needsExtraction as number) ?? 0
        setFilesNeedingAi(needsRec)
        setFilesNeedingExtraction(needsExt)

        if (needsRec > 0) {
          setCurrent(STAGE_RECOGNITION)
          for (let attempt = 0; attempt < 20; attempt++) {
            const { ok, data } = await safeFetch('/api/files/ai-recognize-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            if (!ok) break
            const recovered = (data.recovered as number) ?? 0
            setFilesRecovered((prev) => prev + recovered)
            const status = await safeFetch('/api/files/status')
            if (status.ok) {
              setFilesNeedingExtraction((status.data.needsExtraction as number) ?? 0)
            }
            if (data.done) break
            if ((data.processed as number) === 0) break
            await new Promise(r => setTimeout(r, 300))
          }
        }
      }

      // === File extraction (Phase 2) — one file at a time ===
      const extractionStatus = await safeFetch('/api/files/status')
      const stillNeedExtraction = extractionStatus.ok
        ? (extractionStatus.data.needsExtraction as number) ?? 0
        : 0

      if (stillNeedExtraction > 0) {
        setFilesNeedingExtraction(stillNeedExtraction)
        setCurrent(STAGE_EXTRACTION)
        for (let attempt = 0; attempt < 15; attempt++) {
          const { ok, data } = await safeFetch('/api/files/ai-extract-next', { method: 'POST' })
          if (!ok) break
          if (data.done) break
          if ((data.processed as boolean) === true) {
            setFilesExtracted((prev) => prev + 1)
          }
          await new Promise(r => setTimeout(r, 300))
        }
      }

      // === Metrics + rules + persist (single backend call) ===
      setCurrent(STAGE_METRICS)
      await new Promise(r => setTimeout(r, 400))
      setCurrent(STAGE_RULES)

      const { ok: runOk, data: runData } = await safeFetch('/api/analysis/run', { method: 'POST' })
      if (!runOk) {
        setError((runData.error as string) || 'Ошибка анализа')
        running.current = false
        return
      }
      const total = (runData.total as number) ?? (runData.recommendationCount as number) ?? 0
      setRecommendationCount(total)

      // === AI enhancement (chunked batch polling) ===
      setCurrent(STAGE_AI_ENHANCE)
      for (let attempt = 0; attempt < 30; attempt++) {
        const { ok, data } = await safeFetch('/api/analysis/ai-enhance-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!ok) break

        const status = await safeFetch('/api/analysis/status')
        if (status.ok) {
          setEnhancedCount((status.data.enhanced as number) ?? 0)
        }

        if (data.done) break
        if ((data.processed as number) === 0 && (data.failed as number) === 0) break
        await new Promise(r => setTimeout(r, 300))
      }

      setCurrent(STAGE_AI_ENHANCE + 1)
      await new Promise(r => setTimeout(r, 300))
      setDone(true)
    }

    run()
  }, [useDemo])

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
                {visibleStages.map((label, vi) => {
                  const i = vi + indexOffset
                  const isDone = i < current
                  const isOn = i === current
                  const stageLabel = stageLabelWithProgress(label, i, {
                    recommendationCount,
                    enhancedCount,
                    filesNeedingAi,
                    filesRecovered,
                    filesNeedingExtraction,
                    filesExtracted,
                  }, isOn)
                  return (
                    <div key={i} className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-all"
                      style={{
                        background: isDone ? 'var(--mm-green-bg)' : isOn ? 'var(--mm-white)' : 'transparent',
                        border: isOn ? '1px solid var(--mm-border)' : '1px solid transparent',
                        opacity: !isDone && !isOn ? 0.3 : 1,
                      }}>
                      <div className="flex items-center gap-2.5">
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
                          {stageLabel}
                        </span>
                      </div>
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
        <div className="relative flex w-1/2 flex-col justify-center px-16 py-16" style={{ background: 'var(--mm-ink)' }}>
          <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight text-white" style={{ letterSpacing: '-.03em' }}>
            {done ? 'Готово!' : 'Анализируем\nваши данные'}
          </h1>
          <p className="mb-10 max-w-sm text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,.5)' }}>
            {done
              ? 'Рекомендации сформированы. Переходите к результатам.'
              : 'Проверяем 9 типов рисков, рассчитываем метрики, формируем рекомендации.'}
          </p>

          {!done && (
            <div className="flex flex-col gap-2">
              {visibleStages.map((label, vi) => {
                const i = vi + indexOffset
                const isDone = i < current
                const isOn = i === current
                const stageLabel = stageLabelWithProgress(label, i, {
                  recommendationCount,
                  enhancedCount,
                  filesNeedingAi,
                  filesRecovered,
                  filesNeedingExtraction,
                  filesExtracted,
                }, isOn)
                return (
                  <div key={i} className="flex flex-col gap-1 rounded-xl px-4 py-3.5 transition-all"
                    style={{
                      background: isDone ? 'rgba(52,211,153,.1)' : isOn ? 'rgba(255,255,255,.06)' : 'transparent',
                      border: isOn ? '1px solid rgba(255,255,255,.08)' : '1px solid transparent',
                      opacity: !isDone && !isOn ? 0.25 : 1,
                    }}>
                    <div className="flex items-center gap-3.5">
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
                        {stageLabel}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl px-5 py-4" style={{ background: 'rgba(192,57,43,.15)' }}>
              <div className="text-sm font-medium text-white">{error}</div>
              <button onClick={onCancel}
                className="mt-2 text-sm font-semibold underline"
                style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}>
                Вернуться и попробовать снова
              </button>
            </div>
          )}

          {!done && !error && (
            <button onClick={onCancel}
              className="absolute bottom-8 left-10 text-sm underline"
              style={{ color: 'rgba(255,255,255,.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Отменить и вернуться к загрузке
            </button>
          )}
        </div>

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
  const [useDemo, setUseDemo] = useState(false)
  const [recCount, setRecCount] = useState(0)

  const handleBegin = (demo: boolean) => {
    setUseDemo(demo)
    setStep('analysis')
  }

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
        useDemo={useDemo}
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

  return <StartScreen onBegin={handleBegin} />
}
