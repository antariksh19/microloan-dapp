export function SkeletonTable() {
  return (
    <div className="mb-10 glass-card rounded-3xl overflow-hidden border border-white/10 animate-pulse">
      <div className="flex items-center justify-between border-b border-white/10 p-6">
        <div>
          <div className="h-5 w-40 bg-slate-700/50 rounded-lg mb-2"></div>
          <div className="h-3 w-64 bg-slate-800/80 rounded-full"></div>
        </div>
        <div className="h-9 w-32 bg-slate-800/80 rounded-2xl"></div>
      </div>
      <div className="w-full">
        {/* Table Header Skeleton */}
        <div className="bg-slate-900/40 border-b border-white/5 h-12 flex items-center px-6 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 flex-1 bg-slate-800/80 rounded-full"></div>
          ))}
        </div>
        {/* Table Rows Skeleton */}
        {[1, 2, 3].map((row) => (
          <div key={row} className="border-b border-white/5 h-16 flex items-center px-6 gap-6 bg-white/[0.01]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 flex-1 bg-slate-700/30 rounded-full"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}