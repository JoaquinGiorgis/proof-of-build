import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The golden ninja, with the glint that travels across it.
 *
 * The sweep is a bright diagonal band masked to the ninja's own alpha channel,
 * so the light runs over the figure and stops at its edge instead of painting
 * a rectangle across the page. `screen` keeps it additive — gold stays gold and
 * only gets brighter where the band passes.
 *
 * It rests far more than it moves: 7s of nothing, then the band crosses in
 * ~1.4s. A glint that loops constantly reads as a loading state, not as metal.
 */
export function Ninja({
  src,
  alt = "",
  className,
  priority = false,
  sizes,
  float = true,
  glint = true,
}: {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** The ±6px / 8s idle drift. Off for thumbnails. */
  float?: boolean;
  glint?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn("absolute inset-0", float && "animate-float")}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]"
        />

        {glint && (
          <span
            aria-hidden
            className="ninja-glint pointer-events-none absolute inset-0"
            style={{
              // The mask is the artwork itself, so the band is clipped to the
              // ninja's silhouette — including the gap between its arm and body.
              WebkitMaskImage: `url(${src})`,
              maskImage: `url(${src})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
          />
        )}
      </div>
    </div>
  );
}
