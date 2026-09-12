import { cn } from "@/lib/cn";

/**
 * Figma: Field 10:52 — an inset well, not a raised box. Border 16% white,
 * fill black 35%, inner shadow 0 2px 6px black 60%.
 */

const control =
  "w-full rounded-[14px] border border-[rgb(255_255_255/0.16)] bg-black/35 px-[18px] py-4 " +
  "text-[16px] leading-[1.5] text-white placeholder:text-[rgb(255_255_255/0.3)] " +
  "shadow-[inset_0_2px_6px_0_rgb(0_0_0/0.6)] outline-none " +
  "transition-colors duration-200 focus:border-[rgb(255_255_255/0.4)]";

export function Field({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={cn("flex w-full flex-col gap-2.5", className)}>
      <span className="type-meta text-text-tertiary">{label}</span>
      <input className={control} {...props} />
      {hint && <span className="type-meta text-[rgb(255_255_255/0.3)]">{hint}</span>}
    </label>
  );
}

export function TextareaField({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={cn("flex w-full flex-col gap-2.5", className)}>
      <span className="type-meta text-text-tertiary">{label}</span>
      <textarea className={cn(control, "resize-none")} rows={3} {...props} />
      {hint && <span className="type-meta text-[rgb(255_255_255/0.3)]">{hint}</span>}
    </label>
  );
}
