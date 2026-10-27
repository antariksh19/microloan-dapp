// One strip of headline numbers. items: [{ label, value, note, tone }]
export default function Ledger({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-paper px-5 py-4">
          <dt className="text-sm text-mute">{item.label}</dt>
          <dd className={`mt-1 font-display text-2xl font-semibold tabular-nums ${item.tone ?? "text-ink"}`}>{item.value}</dd>
          {item.note && <p className="mt-0.5 text-xs text-mute">{item.note}</p>}
        </div>
      ))}
    </dl>
  );
}
