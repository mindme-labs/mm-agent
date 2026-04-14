export default function TasksLoading() {
  return (
    <div className="py-6">
      {/* Summary cards skeleton */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border px-5 py-5"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <div className="mb-2 h-3 w-16 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="h-7 w-20 rounded" style={{ background: 'var(--mm-border)' }} />
          </div>
        ))}
      </div>

      {/* Filter tabs skeleton */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex gap-1 animate-pulse rounded-xl border p-1"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded-lg px-4" style={{ width: i === 0 ? 48 : 72, background: i === 0 ? 'var(--mm-border)' : 'transparent' }} />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="animate-pulse overflow-hidden rounded-xl border"
        style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
        <div className="flex gap-4 border-b px-5 py-3.5" style={{ borderColor: 'var(--mm-border)' }}>
          {[140, 60, 60, 60].map((w, i) => (
            <div key={i} className="h-3 rounded" style={{ width: w, background: 'var(--mm-border)' }} />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--mm-border)' }}>
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-3/4 rounded" style={{ background: 'var(--mm-border)' }} />
              <div className="h-3 w-1/3 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
            </div>
            <div className="h-4 w-16 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="h-4 w-20 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
            <div className="h-6 w-16 rounded-full" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
