import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCardSims } from "@/hooks/use-card-sims";
import { buildBoard, formatAmerican, formatEV, formatPct } from "@/lib/mma/betting";
import { EVENTS, allBouts } from "@/lib/mma/cards";
import { fighterById } from "@/lib/mma/fighters";
import { useDesk } from "@/lib/mma/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scanner")({ component: Scanner });

function Scanner() {
  const bouts = useMemo(() => allBouts(), []);
  const { summaries, running, progress, total, n } = useCardSims(bouts);
  const bankroll = useDesk((s) => s.bankroll);
  const kelly = useDesk((s) => s.kelly);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "best" | "trap" | "ml">("all");

  const rows = useMemo(() => {
    const out: {
      boutId: string;
      event: string;
      names: string;
      label: string;
      american: number;
      model: number;
      implied: number;
      ev: number;
      tag: string;
    }[] = [];
    for (const bout of bouts) {
      const sim = summaries[bout.id];
      if (!sim) continue;
      const event = EVENTS.find((e) => e.id === bout.eventId)!;
      const a = fighterById(bout.fighterA);
      const b = fighterById(bout.fighterB);
      const board = buildBoard(bout, a, b, sim, bankroll, kelly);
      for (const r of board) {
        out.push({
          boutId: bout.id,
          event: `${event.name}`,
          names: `${a.last} vs ${b.last}`,
          label: r.label,
          american: r.american,
          model: r.model,
          implied: r.implied,
          ev: r.ev,
          tag: r.tag,
        });
      }
    }
    return out;
  }, [bouts, summaries, bankroll, kelly]);

  const filtered = rows
    .filter((r) => {
      if (kind === "best") return r.tag === "best" || r.tag === "value";
      if (kind === "trap") return r.tag === "trap";
      if (kind === "ml") return r.label.endsWith(" ML");
      return true;
    })
    .filter((r) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return `${r.names} ${r.label} ${r.event}`.toLowerCase().includes(s);
    })
    .sort((a, b) => (kind === "trap" ? a.ev - b.ev : b.ev - a.ev));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Scanner</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Every priced seat across the board, ranked by expected value. The bookmaker prop model is crude on purpose —
          that's where the desk makes its money.
        </p>
        <p className="mt-2 text-xs font-mono text-subtle">
          {running ? `Pricing ${progress}/${total} bouts` : `${rows.length} markets · ${n.toLocaleString()} paths`}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fighter, market, card"
          className="h-11 flex-1 rounded-md border border-line bg-surface px-3 text-sm"
        />
        <div className="flex gap-2">
          {(["all", "best", "trap", "ml"] as const).map((k) => (
            <Button key={k} size="sm" variant={kind === k ? "primary" : "outline"} onClick={() => setKind(k)}>
              {k === "best" ? "+EV" : k}
            </Button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-subtle border-b border-line">
              <th className="px-4 py-3 font-medium">Fight</th>
              <th className="px-2 py-3 font-medium">Market</th>
              <th className="px-2 py-3 font-medium">Price</th>
              <th className="px-2 py-3 font-medium">Model</th>
              <th className="px-2 py-3 font-medium">EV</th>
              <th className="px-4 py-3 font-medium">Tag</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((r) => (
              <tr key={r.boutId + r.label} className="border-b border-line/70 last:border-0">
                <td className="px-4 py-3">
                  <Link to="/fight/$fightId" params={{ fightId: r.boutId }} className="hover:text-accent">
                    <span className="font-medium">{r.names}</span>
                    <span className="block text-[11px] text-subtle">{r.event}</span>
                  </Link>
                </td>
                <td className="px-2 py-3">{r.label}</td>
                <td className="px-2 py-3 font-mono tabular-nums">{formatAmerican(r.american)}</td>
                <td className="px-2 py-3 font-mono tabular-nums text-muted">{formatPct(r.model)}</td>
                <td className={cn("px-2 py-3 font-mono tabular-nums", r.ev >= 0.025 ? "text-edge" : r.ev <= -0.05 ? "text-loss" : "text-muted")}>
                  {formatEV(r.ev)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={r.tag === "best" ? "best" : r.tag === "value" ? "edge" : r.tag === "trap" ? "loss" : "neutral"}>
                    {r.tag}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
