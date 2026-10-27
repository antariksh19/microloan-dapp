import { btn } from "./styles";

export default function EmptyState({ title, children, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm text-mute">{children}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className={`${btn("primary")} mt-5`}>
          {action.label}
        </button>
      )}
    </div>
  );
}
