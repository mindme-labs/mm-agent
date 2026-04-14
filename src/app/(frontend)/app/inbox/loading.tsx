export default function InboxLoading() {
  return (
    <div className="py-6">
      {/* Summary cards skeleton */}
      <div className="mb-3 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border px-5 py-5"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <div className="mb-2 h-3 w-16 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="h-7 w-28 rounded" style={{ background: 'var(--mm-border)' }} />
          </div>
        ))}
      </div>
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border px-5 py-4"
            style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)' }}>
            <div className="mb-2 h-3 w-20 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="h-5 w-16 rounded" style={{ background: 'var(--mm-border)' }} />
          </div>
        ))}
      </div>

      {/* Section heading skeleton */}
      <div className="mb-5">
        <div className="h-3 w-40 animate-pulse rounded" style={{ background: 'var(--mm-border)' }} />
      </div>

      {/* Card skeletons */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-4 animate-pulse overflow-hidden rounded-2xl border"
          style={{ background: 'var(--mm-white)', borderColor: 'var(--mm-border)', borderTop: '3px solid var(--mm-border)' }}>
          <div className="p-8 lg:p-9">
            <div className="mb-3 h-6 w-3/4 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="mb-5 h-4 w-32 rounded" style={{ background: 'var(--mm-border)' }} />
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-full rounded" style={{ background: 'var(--mm-border)' }} />
                <div className="h-3 w-5/6 rounded" style={{ background: 'var(--mm-border)' }} />
                <div className="h-3 w-4/6 rounded" style={{ background: 'var(--mm-border)' }} />
              </div>
              <div className="rounded-xl p-5" style={{ background: 'var(--mm-green-bg)', opacity: 0.4 }}>
                <div className="mb-2 h-3 w-16 rounded" style={{ background: 'var(--mm-border)' }} />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded" style={{ background: 'var(--mm-border)' }} />
                  <div className="h-3 w-3/4 rounded" style={{ background: 'var(--mm-border)' }} />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 border-t pt-5" style={{ borderColor: 'var(--mm-border)' }}>
              <div className="h-10 w-36 rounded-lg" style={{ background: 'var(--mm-border)' }} />
              <div className="h-10 w-28 rounded-lg" style={{ background: 'var(--mm-border)', opacity: 0.5 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
