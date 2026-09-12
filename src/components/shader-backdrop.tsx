import { cn } from "@/lib/cn";
import { LiquidBlack } from "./liquid-black";

/**
 * The liquid-black plate that sits behind the top of every screen and fades
 * into the page background. Figma: "Shader · Liquid Black" (5:3, 6:7, …).
 */
export function ShaderBackdrop({
  className,
  height = "h-[min(960px,105vh)]",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 -z-10",
        height,
        className,
      )}
    >
      <LiquidBlack />
      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-transparent to-black" />
    </div>
  );
}
