// Shared class strings so every page uses the same controls.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
const sizes = { md: "px-4 py-2.5 text-sm", sm: "px-3 py-1.5 text-xs", lg: "px-5 py-3 text-base" };
const variants = {
  primary: "bg-lagoon text-white hover:bg-lagoon-deep",
  quiet: "bg-paper text-ink border border-line hover:bg-fog",
  danger: "bg-coral text-white hover:bg-coral-deep",
  ink: "bg-ink text-white hover:bg-black",
};

export const btn = (variant = "primary", size = "md") => `${base} ${sizes[size]} ${variants[variant]}`;

export const field =
  "w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink placeholder:text-mute/60 disabled:opacity-60";
export const fieldLabel = "mb-1.5 block text-sm font-medium text-ink";
export const panel = "rounded-2xl border border-line bg-paper";
export const linkClass = "font-medium text-lagoon underline underline-offset-2 hover:no-underline";
