import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Badge/Verified — Figma 3:10                                                 */
/* Status pill. Text is uppercase mono 11px, tracking 12%.                     */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  dot = true,
  className,
}: {
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full py-2 pr-[14px] pl-3",
        "border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] backdrop-blur-[12px]",
        "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)]",
        "type-meta text-text-secondary",
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-white shadow-[0_0_8px_0_rgb(255_255_255/0.6)]"
        />
      )}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Meta/Row — Figma 3:13                                                       */
/* 11px uppercase mono label (45% white) over a 16px value.                    */
/* -------------------------------------------------------------------------- */

export function MetaRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="type-meta text-text-tertiary">{label}</span>
      <span className="type-body-m text-text-primary break-words">
        {children}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step/Indicator — Figma 3:16                                                 */
/* Active: 28px white line + label 100%. Inactive: 12px line 20%, label 45%.   */
/* -------------------------------------------------------------------------- */

export function StepIndicator({
  label,
  active = false,
  className,
}: {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "h-px shrink-0 transition-all duration-[240ms] ease-[var(--ease-out-soft)]",
          active ? "w-7 bg-white" : "w-3 bg-[rgb(255_255_255/0.2)]",
        )}
      />
      <span
        className={cn(
          "type-meta transition-colors duration-[240ms]",
          active ? "text-text-primary" : "text-text-tertiary",
        )}
      >
        {label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Track/Chip — Figma 3:19                                                     */
/* Selected: fill 6%, border 20%. Unselected: fill 3.5%, border 8%, text 72%.  */
/* -------------------------------------------------------------------------- */

export function TrackChip({
  children,
  selected = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative rounded-xl px-[18px] py-3 text-[15px] leading-none font-medium tracking-[-0.033em]",
        "backdrop-blur-[12px] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)]",
        "transition-[background-color,border-color,transform] duration-[180ms] ease-[var(--ease-out-soft)]",
        "active:scale-[0.98] focus-ring",
        selected
          ? "border border-[rgb(255_255_255/0.2)] bg-[rgb(255_255_255/0.06)] text-white"
          : "border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.035)] text-text-secondary hover:border-[rgb(255_255_255/0.12)] hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Section eyebrow — the "01 — BUILD" rule + label used across every screen.   */
/* -------------------------------------------------------------------------- */

export function Eyebrow({
  children,
  rule = false,
  className,
}: {
  children: React.ReactNode;
  rule?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {rule && <span aria-hidden className="h-px w-full bg-border-subtle" />}
      <span className="type-meta text-text-tertiary">{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Glass panel — the liquid-glass surface from spec section 03.               */
/* -------------------------------------------------------------------------- */

export function GlassPanel({
  children,
  hover = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        "glass glass-grain rounded-3xl",
        hover && "glass-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
