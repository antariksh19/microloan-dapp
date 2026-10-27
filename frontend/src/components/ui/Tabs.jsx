// tabs: [{ id, label, count }]
export default function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              selected ? "border-lagoon text-ink" : "border-transparent text-mute hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selected ? "bg-lagoon-wash text-lagoon-deep" : "bg-fog text-mute"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
