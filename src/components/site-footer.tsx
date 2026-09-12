import { cn } from "@/lib/cn";
import { CLUSTER_LABEL } from "@/lib/solana/cluster";

/** Figma: Footer 5:45. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-5 pt-10 pb-12 md:flex-row md:items-center md:justify-between md:px-10",
        className,
      )}
    >
      <span className="type-meta text-text-tertiary">Proof of Build</span>
      <span className="type-meta text-text-tertiary">
        Onchain infrastructure · Solana {CLUSTER_LABEL}
      </span>
    </footer>
  );
}
