/**
 * Server component rendered on the Payload Admin dashboard. Provides a
 * one-click link to the v3.3.1 onboarding-funnel dashboard which lives at
 * /app/admin/funnel (outside Payload Admin).
 *
 * Wired via `payload.config.ts` -> `admin.components.beforeDashboard`.
 */
export default function FunnelDashboardLink() {
  return (
    <div
      style={{
        margin: '0 0 24px',
        padding: '20px 24px',
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>
        Дашборд воронки онбординга
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
        6 блоков аналитики по онбордингу: воронка шагов, выборы в развилке,
        распределение моделей AI, override-пары, времена этапов, когорты по дням.
      </p>
      <a
        href="/app/admin/funnel"
        style={{
          display: 'inline-block',
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 600,
          background: '#0F7B5C',
          color: '#fff',
          borderRadius: 6,
          textDecoration: 'none',
        }}
      >
        Открыть дашборд →
      </a>
    </div>
  )
}
