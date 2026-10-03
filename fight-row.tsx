import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { ProbBar } from "@/components/prob-bar";
import { formatAmerican, formatEV, noVigPair } from "@/lib/mma/betting";
import { displayName, recordString } from "@/lib/mma/fighters";
import { billingLabel } from "@/lib/mma/format";
import type { Bout, EventCard, Fighter, LineRow, SimSummary } from "@/lib/mma/types";
import { cn } from "@/lib/utils";

export function FightRow({
  bout,
  event,
  a,
  b,
  sim,
  topBet,
}: {
  bout: Bout;
  event: EventCard;
  a: Fighter;
  b: Fighter;
  sim?: SimSummary;
  topBet?: LineRow;
}) {
  const [nvA] = noVigPair(bout.market.mlA, bout.market.mlB);
  return (
    <Link
      to="/fight/$fightId"
      params={{ fightId: bout.id }}
      className="block rounded-xl border border-line bg-surface p-4 sm:p-5 hover:border-line-strong transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge>{billingLabel(bout.billing)}</Badge>
        {bout.title && <Badge tone="warn">Title</Badge>}
        <span className="text-[11px] uppercase tracking-[0.12em] text-subtle">{bout.weight}</span>
        <span className="ml-auto text-[11px] text-subtle">{bout.rounds} × 5:00</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <p className="font-display text-2xl font-semibold leading-none">{displayName(a)}</p>
          <p className="mt-1 text-xs text-muted">
            {recordString(a)}
            {a.ranking ? ` · ${a.ranking === "C" ? "C" : `#${a.ranking}`}` : ""} · {formatAmerican(bout.market.mlA)}
          </p>
        </div>
        <div className="hidden sm:block text-[11px] uppercase tracking-[0.16em] text-subtle pb-1">vs</div>
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold leading-none">{displayName(b)}</p>
          <p className="mt-1 text-xs text-muted">
            {formatAmerican(bout.market.mlB)} · {recordString(b)}
            {b.ranking ? ` · ${b.ranking === "C" ? "C" : `#${b.ranking}`}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-4">
        {sim ? (
          <ProbBar pA={sim.pA} pB={sim.pB} />
        ) : (
          <ProbBar pA={nvA} pB={1 - nvA} />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {sim ? (
            <>
              {topBet && (
                <span className={cn(topBet.ev > 0 ? "text-edge" : "text-loss")}>
                  Best seat: {topBet.label} {formatEV(topBet.ev)}
                </span>
              )}
              <span className="text-subtle">model vs market</span>
            </>
          ) : (
            <span>{event.city} · running sims…</span>
          )}
        </div>
      </div>
    </Link>
  );
}
