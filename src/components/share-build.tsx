"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies the public build URL. Falls back to the Web Share sheet on mobile. */
export function ShareBuild({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/b/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // The user dismissed the sheet — fall through to the clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="glass" onClick={share}>
      {copied ? "Link copied" : "Share build"}
    </Button>
  );
}
