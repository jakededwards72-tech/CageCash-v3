import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/mma/betting";

export function ProbBar({
  pA,
  pB,
  labelA,
  labelB,
  size = "md",
}: {
  pA: number;
  pB: number;
  labelA?: string;
  labelB?: string;
  size?: "sm" | "md";
}) {
  const draw = Math.max(0, 1 - pA - pB);
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div>
      <div className="flex justify-between text-xs font-mono tabular-nums mb-1">
        <span className="text-red-corner">
          {labelA ? `${labelA} ` : ""}
          {formatPct(pA)}
        </span>
        <span className="text-blue-corner">
          {formatPct(pB)}
          {labelB ? ` ${labelB}` : ""}
        </span>
      </div>
      <div className={cn("flex w-full overflow-hidden rounded-full bg-elevated", h)}>
        <div className="bg-red-corner" style={{ width: `${pA * 100}%` }} />
        {draw > 0.004 && <div className="bg-subtle" style={{ width: `${draw * 100}%` }} />}
        <div className="bg-blue-corner" style={{ width: `${pB * 100}%` }} />
      </div>
    </div>
  );
}
