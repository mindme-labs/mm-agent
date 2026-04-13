'use client'

interface FileRow {
  id: string
  originalName: string
  detectedType?: string
  accountCode?: string
  period?: string
  parseStatus: 'pending' | 'recognizing' | 'parsing' | 'success' | 'warning' | 'error'
  createdAt: string
}

interface Metrics {
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  accountsReceivable: number
  accountsPayable: number
  inventory: number
  arTurnoverDays: number
  apTurnoverDays: number
  inventoryTurnoverDays: number
  healthIndex?: 'fine' | 'issues' | 'risky'
  period?: string
}

interface Debtor {
  name: string
  amount: number
  share: number
}

interface Creditor {
  name: string
  amount: number
  hasAdvance: boolean
}

interface DataViewProps {
  files: FileRow[]
  metrics: Metrics | null
  topDebtors: Debtor[]
  topCreditors: Creditor[]
}

function fmtRub(n: number): string {
  if (n >= 1_000_000) return `₽${(n / 1_000_000).toFixed(1)} млн`
  if (n >= 1_000) return `₽${Math.round(n / 1_000)} тыс.`
  if (n > 0) return `₽${n.toLocaleString('ru-RU')}`
  return '₽0'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Ожидание', bg: '#F1F0EC', color: 'var(--mm-muted)' },
  recognizing: { label: 'Распознавание', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  parsing: { label: 'Парсинг', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  success: { label: 'Готов', bg: 'var(--mm-green-bg)', color: 'var(--mm-green)' },
  warning: { label: 'С замечаниями', bg: 'var(--mm-yellow-bg)', color: 'var(--mm-yellow)' },
  error: { label: 'Ошибка', bg: 'var(--mm-red-bg)', color: 'var(--mm-red)' },
}

const HEALTH_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  fine: { label: 'В норме', bg: 'var(--mm-green-bg)', color: 'var(--mm-green)' },
  issues: { label: 'Есть вопросы', bg: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' },
  risky: { label: 'Высокий риск', bg: 'var(--mm-red-bg)', color: 'var(--mm-red)' },
}

const ACCOUNT_LABELS: Record<string, string> = {
  '10': 'Материалы',
  '41': 'Товары',
  '45': 'Товары отгруженные',
  '60': 'Расчёты с поставщиками',
  '62': 'Расчёты с покупателями',
  '90.01': 'Выручка',
  '90.02': 'Себестоимость',
}

export function DataView({ files, metrics, topDebtors, topCreditors }: DataViewProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Files table */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--mm-muted)', letterSpacing: '.07em' }}>
          Загруженные файлы — {files.length}
        </h2>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border py-12 text-center"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--mm-muted)' }}>
              Файлы ещё не загружены
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              background: 'var(--mm-white)', border: '1px solid var(--mm-border)',
              borderRadius: 12, overflow: 'hidden', minWidth: 580,
            }}>
              <thead>
                <tr>
                  {['Файл', 'Счёт', 'Период', 'Статус', 'Дата загрузки'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 12, fontWeight: 600,
                      color: 'var(--mm-muted)', padding: '14px 18px',
                      borderBottom: '1px solid var(--mm-border)', letterSpacing: '.03em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const st = STATUS_MAP[file.parseStatus] ?? STATUS_MAP.pending
                  return (
                    <tr key={file.id}>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--mm-border)', fontSize: 14, fontWeight: 600, color: 'var(--mm-ink)', maxWidth: 240 }}>
                        <div className="truncate">{file.originalName}</div>
                        {file.detectedType && (
                          <div className="mt-0.5 text-xs font-normal" style={{ color: 'var(--mm-muted)' }}>{file.detectedType}</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--mm-border)', fontSize: 13, color: 'var(--mm-ink2)', whiteSpace: 'nowrap' }}>
                        {file.accountCode ? (
                          <span title={ACCOUNT_LABELS[file.accountCode]}>
                            {file.accountCode}
                            {ACCOUNT_LABELS[file.accountCode] && (
                              <span className="ml-1 text-xs" style={{ color: 'var(--mm-muted)' }}>
                                {ACCOUNT_LABELS[file.accountCode]}
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--mm-border)', fontSize: 13, color: 'var(--mm-ink2)', whiteSpace: 'nowrap' }}>
                        {file.period ?? '—'}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--mm-border)' }}>
                        <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--mm-border)', fontSize: 13, color: 'var(--mm-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(file.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Metrics */}
      {metrics && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--mm-muted)', letterSpacing: '.07em' }}>
            Финансовые показатели{metrics.period ? ` за ${metrics.period}` : ''}
          </h2>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Выручка" value={fmtRub(metrics.revenue)} />
            <MetricCard label="Себестоимость" value={fmtRub(metrics.cogs)} />
            <MetricCard label="Валовая прибыль" value={fmtRub(metrics.grossProfit)}
              accent={metrics.grossProfit > 0 ? 'var(--mm-green)' : 'var(--mm-red)'} />
            <MetricCard label="Рентабельность" value={`${metrics.grossMargin.toFixed(1)}%`}
              badge={metrics.healthIndex ? HEALTH_CONFIG[metrics.healthIndex] : undefined} />
            <MetricCard label="Вам должны (ДЗ)" value={fmtRub(metrics.accountsReceivable)}
              accent="var(--mm-red)" />
            <MetricCard label="Вы должны (КЗ)" value={fmtRub(metrics.accountsPayable)} />
            <MetricCard label="Запасы на складе" value={fmtRub(metrics.inventory)} />
            <MetricCard label="Оборачиваемость"
              value={`ДЗ ${metrics.arTurnoverDays} · КЗ ${metrics.apTurnoverDays} · Зап. ${metrics.inventoryTurnoverDays} дн.`}
              small />
          </div>
        </section>
      )}

      {/* Top debtors & creditors side by side */}
      {(topDebtors.length > 0 || topCreditors.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {topDebtors.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--mm-muted)', letterSpacing: '.07em' }}>
                Топ дебиторов — кто вам должен
              </h2>
              <div className="overflow-hidden rounded-xl border"
                style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Контрагент', 'Сумма', 'Доля'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', fontSize: 12, fontWeight: 600,
                          color: 'var(--mm-muted)', padding: '12px 16px',
                          borderBottom: '1px solid var(--mm-border)', letterSpacing: '.03em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topDebtors.map((d, i) => {
                      const isConcentrated = d.share > 30
                      return (
                        <tr key={i} style={{ background: isConcentrated ? 'var(--mm-red-bg)' : undefined }}>
                          <td style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                            fontSize: 14, fontWeight: 500, color: 'var(--mm-ink)', maxWidth: 200,
                          }}>
                            <div className="truncate">{d.name}</div>
                          </td>
                          <td style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                            fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap',
                            color: isConcentrated ? 'var(--mm-red)' : 'var(--mm-ink)',
                          }}>
                            {fmtRub(d.amount)}
                          </td>
                          <td style={{
                            padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                            fontSize: 13, fontWeight: isConcentrated ? 700 : 500, whiteSpace: 'nowrap',
                            color: isConcentrated ? 'var(--mm-red)' : 'var(--mm-muted)',
                          }}>
                            {d.share}%
                            {isConcentrated && (
                              <span className="ml-1.5 text-xs font-semibold" style={{ color: 'var(--mm-red)' }}>
                                риск
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {topCreditors.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--mm-muted)', letterSpacing: '.07em' }}>
                Топ кредиторов — кому вы должны
              </h2>
              <div className="overflow-hidden rounded-xl border"
                style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Контрагент', 'Сумма', 'Аванс'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', fontSize: 12, fontWeight: 600,
                          color: 'var(--mm-muted)', padding: '12px 16px',
                          borderBottom: '1px solid var(--mm-border)', letterSpacing: '.03em',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topCreditors.map((c, i) => (
                      <tr key={i}>
                        <td style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                          fontSize: 14, fontWeight: 500, color: 'var(--mm-ink)', maxWidth: 200,
                        }}>
                          <div className="truncate">{c.name}</div>
                        </td>
                        <td style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                          fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--mm-ink)',
                        }}>
                          {fmtRub(c.amount)}
                        </td>
                        <td style={{
                          padding: '12px 16px', borderBottom: '1px solid var(--mm-border)',
                          fontSize: 13, whiteSpace: 'nowrap',
                        }}>
                          {c.hasAdvance ? (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{ background: 'var(--mm-amber-bg)', color: 'var(--mm-amber)' }}>
                              Есть аванс
                            </span>
                          ) : (
                            <span style={{ color: 'var(--mm-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* No analysis data state */}
      {!metrics && files.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border py-12 text-center"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--mm-ink)' }}>
            Анализ ещё не проведён
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--mm-muted)' }}>
            Загрузите файлы и запустите анализ для получения метрик
          </p>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent, badge, small }: {
  label: string
  value: string
  accent?: string
  badge?: { label: string; bg: string; color: string }
  small?: boolean
}) {
  return (
    <div className="rounded-xl border px-5 py-4"
      style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
      <div className="mb-1.5 text-xs font-medium" style={{ color: 'var(--mm-muted)' }}>{label}</div>
      <div className={small ? 'text-sm font-bold leading-snug' : 'text-xl font-extrabold leading-none tracking-tight lg:text-2xl'}
        style={{ color: accent ?? 'var(--mm-ink)', letterSpacing: small ? undefined : '-.02em' }}>
        {value}
      </div>
      {badge && (
        <div className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </div>
      )}
    </div>
  )
}
