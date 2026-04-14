export default function DataLoading() {
  return (
    <div className="py-6">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded" style={{ background: 'var(--mm-border)' }} />
        <div className="h-10 w-36 animate-pulse rounded-lg" style={{ background: 'var(--mm-border)' }} />
      </div>

      {/* Files section */}
      <div className="mb-8">
        <div className="mb-4 h-3 w-36 animate-pulse rounded" style={{ background: 'var(--mm-border)' }} />
        <div className="animate-pulse overflow-hidden rounded-xl border"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
          <div className="flex gap-4 border-b px-5 py-3.5" style={{ borderColor: 'var(--mm-border)' }}>
            {[120, 60, 60, 50, 80].map((w, i) => (
              <div key={i} className="h-3 rounded" style={{ width: w, background: 'var(--mm-border)' }} />
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b px-5 py-3.5" style={{ borderColor: 'var(--mm-border)' }}>
              <div className="h-4 w-40 rounded" style={{ background: 'var(--mm-border)' }} />
              <div className="h-4 w-16 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
              <div className="h-4 w-16 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
              <div className="h-5 w-14 rounded-full" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
              <div className="h-4 w-20 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="mb-8">
        <div className="mb-4 h-3 w-44 animate-pulse rounded" style={{ background: 'var(--mm-border)' }} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border px-5 py-4"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              <div className="mb-2 h-3 w-20 rounded" style={{ background: 'var(--mm-border)' }} />
              <div className="h-6 w-24 rounded" style={{ background: 'var(--mm-border)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Debtors/creditors skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="mb-4 h-3 w-44 animate-pulse rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="animate-pulse overflow-hidden rounded-xl border"
              style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center gap-4 border-b px-4 py-3" style={{ borderColor: 'var(--mm-border)' }}>
                  <div className="h-4 flex-1 rounded" style={{ background: 'var(--mm-border)' }} />
                  <div className="h-4 w-20 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
                  <div className="h-4 w-10 rounded" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
