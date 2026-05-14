export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-slate-200 rounded-xl ${className}`}
      style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-200 flex-shrink-0" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        <div className="flex-1">
          <div className="h-7 w-10 bg-slate-200 rounded-lg mb-1.5" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
          <div className="h-3 w-24 bg-slate-200 rounded-lg" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

export function ResidentCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="aspect-[3/4] w-full bg-slate-200" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
      <div className="px-3 py-2.5">
        <div className="h-4 w-3/4 bg-slate-200 rounded-lg mb-1.5" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        <div className="h-3 w-1/2 bg-slate-200 rounded-lg" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

export function ResidentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-t border-slate-100 first:border-t-0">
      <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
      <div className="flex-1">
        <div className="h-4 w-40 bg-slate-200 rounded-lg mb-1.5" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
        <div className="h-3 w-24 bg-slate-200 rounded-lg" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  )
}
