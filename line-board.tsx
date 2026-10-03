import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAmerican, formatEV, formatPct } from "@/lib/mma/betting";
import type { BetMarket, LineRow } from "@/lib/mma/types";
import { useDesk } from "@/lib/mma/store";
import { cn } from "@/lib/utils";

const TONE: Record<LineRow["tag"], "best" | "edge" | "neutral" | "loss" | "warn"> = {
  best: "best",
  value: "edge",
  fair: "neutral",
  pass: "warn",
  trap: "loss",
};

export function LineBoard({
  rows,
  boutId,
  eventId,
  filter,
}: {
  rows: LineRow[];
  boutId: string;
  eventId: string;
  filter?: "all" | "plus" | "ml" | "method" | "rounds";
}) {
  const addBet = useDesk((s) => s.addBet);
  const slip = useDesk((s) => s.slip);
  const shown = rows.filter((r) => {
    if (!filter || filter === "all") return true;
    if (filter === "plus") return r.tag === "best" || r.tag === "value";
    if (filter === "ml") return r.market === "mlA" || r.market === "mlB";
    if (filter === "method") return ["koA", "subA", "decA", "koB", "subB", "decB"].includes(r.market);
    return ["over25", "under25", "goesDistance", "doesntGoDistance", "round1", "round2", "round3", "round4", "round5"].includes(
      r.market,
    );
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-subtle border-b border-line">
            <th className="px-4 py-3 font-medium">Market</th>
            <th className="px-2 py-3 font-medium">Price</th>
            <th className="px-2 py-3 font-medium">Implied</th>
            <th className="px-2 py-3 font-medium">Model</th>
            <th className="px-2 py-3 font-medium">EV</th>
            <th className="px-2 py-3 font-medium">Stake</th>
            <th className="px-2 py-3 font-medium" />
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const id = `${boutId}:${r.market}`;
            const on = slip.some((b) => b.id === id);
            return (
              <tr key={r.market} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3 font-medium">{r.label}</td>
                <td className="px-2 py-3 font-mono tabular-nums">{formatAmerican(r.american)}</td>
                <td className="px-2 py-3 font-mono tabular-nums text-muted">{formatPct(r.implied)}</td>
                <td className="px-2 py-3 font-mono tabular-nums">{formatPct(r.model)}</td>
                <td className={cn("px-2 py-3 font-mono tabular-nums", r.ev >= 0.025 ? "text-edge" : r.ev <= -0.05 ? "text-loss" : "text-muted")}>
                  {formatEV(r.ev)}
                </td>
                <td className="px-2 py-3 font-mono tabular-nums text-muted">
                  {r.stake > 0 ? `$${r.stake.toFixed(0)}` : "—"}
                </td>
                <td className="px-2 py-3">
                  <Badge tone={TONE[r.tag]}>{r.tag}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={on ? "outline" : r.tag === "trap" ? "ghost" : "primary"}
                    onClick={() =>
                      addBet({
                        id,
                        boutId,
                        eventId,
                        label: r.label,
                        market: r.market as BetMarket,
                        american: r.american,
                        model: r.model,
                        ev: r.ev,
                        stake: r.stake || 10,
                      })
                    }
                  >
                    {on ? "On slip" : "Add"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
