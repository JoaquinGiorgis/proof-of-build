"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Figma: Button/Primary 3:3 · Button/Glass 3:5 · Button/Ghost 3:7.
 *
 * Primary  — white pill on black. Hover: brightness .94, translateY(-1px).
 * Glass    — liquid glass. Hover: border 12% white, fill 6%.
 * Ghost    — text only, 72% → 100%.
 * All three: tap scale .98 over 120ms.
 */

export type ButtonVariant = "primary" | "glass" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full " +
  "text-[15px] font-medium leading-none tracking-[-0.033em] whitespace-nowrap " +
  "transition-[transform,background-color,border-color,filter,opacity] duration-[180ms] ease-[var(--ease-out-soft)] " +
  "active:scale-[0.98] active:duration-[120ms] focus-ring " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-white px-[22px] py-[14px] text-black " +
    "shadow-[0_0_12px_0_rgb(255_255_255/0.12)] " +
    "hover:-translate-y-px hover:brightness-[0.94]",
  glass:
    "relative px-[22px] py-[14px] text-white " +
    "border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] backdrop-blur-[12px] " +
    "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)] " +
    "hover:border-[rgb(255_255_255/0.12)] hover:bg-[rgb(255_255_255/0.06)]",
  ghost:
    "group px-1 py-[14px] text-[rgb(255_255_255/0.72)] hover:text-white",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  },
);

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}
