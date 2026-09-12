"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * `prefers-reduced-motion`, read as an external store rather than copied into
 * state from an effect. The server has no media queries, so it answers `false`
 * — matching the first client render and keeping hydration quiet.
 */
const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersMotion() {
  return !window.matchMedia(REDUCED).matches;
}

/**
 * The ninja, turning.
 *
 * The still is always rendered underneath and the video fades in over it once
 * it can play, so the figure is there on first paint and the page never shows
 * a hole. Under `prefers-reduced-motion` the video is never loaded at all —
 * a spinning object is exactly what that setting is asking you not to do.
 *
 * Paused while offscreen: a looping video behind five scrolled sections is
 * decode work nobody is watching.
 */
export function NinjaTurntable({
  poster,
  mp4,
  webm,
  alt = "",
  className,
  sizes,
  priority = false,
}: {
  poster: string;
  mp4: string;
  webm?: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const motion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersMotion,
    () => false,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !motion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [motion]);

  return (
    /* The blend lives here, on the outermost element, and not on the <video>.
       An ancestor with a transform — `animate-float`, say — creates a stacking
       context, and a blend inside one composites against that context rather
       than against the page. The video would then screen against nothing and
       its opaque black plate would sit as a rectangle over the shader. */
    <div className={cn("relative mix-blend-screen", className)}>
      <Image
        src={poster}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          "object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]",
          "transition-opacity duration-700",
          playing ? "opacity-0" : "opacity-100",
        )}
      />

      {motion && (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={cn(
            "absolute inset-0 size-full object-contain",
            "transition-opacity duration-700",
            playing ? "opacity-100" : "opacity-0",
          )}
        >
          {webm && <source src={webm} type="video/webm" />}
          <source src={mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
