import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "win" | "loss" | "warn" | "edge" | "best";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-elevated text-muted border-line",
    win: "bg-win/15 text-win border-win/20",
    loss: "bg-loss/15 text-loss border-loss/20",
    warn: "bg-warn/15 text-warn border-warn/20",
    edge: "bg-edge/15 text-edge border-edge/20",
    best: "bg-accent text-accent-fg border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
