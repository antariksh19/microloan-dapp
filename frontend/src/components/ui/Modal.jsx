"use client";
import { useEffect, useRef } from "react";

// Closes on Escape or a click outside. Focus moves into the dialog and the page behind stops scrolling.
export default function Modal({ title, onClose, children, size = "md" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);

  // Keep the latest onClose without re-running the focus setup on every parent render.
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("input, button:not([data-close])")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-paper p-6 shadow-2xl sm:rounded-2xl ${
          size === "sm" ? "sm:max-w-sm" : "sm:max-w-md"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 cursor-pointer rounded-lg px-2.5 py-1 text-2xl leading-none text-mute hover:bg-fog hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
