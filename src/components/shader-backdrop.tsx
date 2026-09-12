import { cn } from "@/lib/cn";
import { LiquidBlack } from "./liquid-black";

/**
 * The liquid-black plate, as one fixed viewport-sized layer behind the whole
 * site. Figma: "Shader · Liquid Black" (5:3, 6:7, …).
 *
 * Fixed rather than per-section: the canvas is the size of the viewport and
 * stays put while the page scrolls, so the material reads the same at the top
 * of the landing and at the footer. It also keeps the GPU cost constant — one
 * canvas, never taller than the screen, no matter how long the page gets.
 */
export function ShaderBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10", className)}
    >
      <LiquidBlack />
    </div>
  );
}
