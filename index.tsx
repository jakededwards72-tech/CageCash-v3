import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Mountain, Radio, Activity, Crosshair, ShieldCheck, Sparkles } from "lucide-react";
import { FightRow } from "@/components/fight-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCardSims } from "@/hooks/use-card-sims";
import { buildBoard, formatEV } from "@/lib/mma/betting";
import { EVENTS, FEATURED_EVENT_ID } from "@/lib/mma/cards";
import { fighterById } from "@/lib/mma/fighters";
import { eventTitle, formatDate, formatDateLong } from "@/lib/mma/format";
import { useDesk } from "@/lib/mma/store";
import type { LineRow } from "@/lib/mma/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const featured = EVENTS.find((e) => e.id === FEATURED_EVENT_ID)!;
  const upcoming = EVENTS.filter((e) => e.id !== FEATURED_EVENT_ID);
  const { summaries, progress, running, n, total } = useCardSims(featured.bouts);
  const bankroll = useDesk((s) => s.bankroll);
  const kelly = useDesk((s) => s.kelly);

  const seats: { boutId: string; names: string; row: LineRow }[] = [];
  const traps: { boutId: string; names: string; row: LineRow }[] = [];
  for (const bout of featured.bouts) {
    const sim = summaries[bout.id];
    if (!sim) continue;
    const a = fighterById(bout.fighterA);
    const b = fighterById(bout.fighterB);
    const board = buildBoard(bout, a, b, sim, bankroll, kelly);
    for (const row of board) {
      if (row.tag === "best" || row.tag === "value") {
        seats.push({ boutId: bout.id, names: `${a.last} / ${b.last}`, row });
      }
      if (row.tag === "trap") {
        traps.push({ boutId: bout.id, names: `${a.last} / ${b.last}`, row });
      }
    }
  }
  seats.sort((x, y) => y.row.ev - x.row.ev);
  traps.sort((x, y) => x.row.ev - y.row.ev);

  return (
    <div className="space-y-8">
      <section className="glass relative overflow-hidden rounded-[28px] border border-line p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
          <Radio className="size-3.5" />
          Live desk · {formatDateLong(featured.date)}
        </div>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight">
          {featured.name}
          <span className="text-muted"> / {featured.subtitle}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted">Independent MMA pricing built for fight night. CageCash runs {n.toLocaleString()} paths per bout, removes sportsbook vig, maps win conditions, and turns the output into a readable betting decision.</p>
        <div className="mt-5 grid grid-cols-3 gap-2 max-w-xl">
          <MiniKpi icon={<Activity className="size-3.5"/>} label="Engine" value={running ? "PRICING" : "READY"} />
          <MiniKpi icon={<Crosshair className="size-3.5"/>} label="Paths" value={n.toLocaleString()} />
          <MiniKpi icon={<ShieldCheck className="size-3.5"/>} label="Mode" value="NO-VIG" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Badge tone="warn">
            <Mountain className="size-3 mr-1" />
            {featured.city} · {featured.altitudeFt.toLocaleString()} ft
          </Badge>
          <span className="text-xs text-subtle">{featured.timezoneNote}</span>
        </div>
        {running && (
          <p className="mt-4 text-xs font-mono text-muted">
            Running card · {progress}/{total} bouts · {n.toLocaleString()} paths each
          </p>
        )}
        {!running && progress > 0 && (
          <p className="mt-4 text-xs font-mono text-edge">
            Card priced · {total} bouts · {n.toLocaleString()} simulations
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/event/$eventId" params={{ eventId: featured.id }}>
              Open full card
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/scanner">Value scanner</Link>
          </Button>
        </div>
      </section>

      {seats.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-[10px] uppercase tracking-[.18em] text-edge">CageCash radar</p><h2 className="font-display text-3xl">Best edges tonight</h2></div>
            <Link to="/scanner" className="text-xs uppercase tracking-[0.14em] text-muted hover:text-fg">
              All edges
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {seats.slice(0, 4).map((s) => (
              <Link
                key={s.row.market + s.boutId}
                to="/fight/$fightId"
                params={{ fightId: s.boutId }}
                className="rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">{s.names}</p>
                <p className="mt-1 font-medium">{s.row.label}</p>
                <p className="mt-1 font-mono text-sm text-edge">{formatEV(s.row.ev)} EV</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {traps.length > 0 && (
        <section>
          <div className="mb-3"><p className="text-[10px] uppercase tracking-[.18em] text-loss">Market warning</p><h2 className="font-display text-3xl">Overpriced seats</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {traps.slice(0, 4).map((s) => (
              <Link
                key={s.row.market + s.boutId}
                to="/fight/$fightId"
                params={{ fightId: s.boutId }}
                className="rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">{s.names}</p>
                <p className="mt-1 font-medium">{s.row.label}</p>
                <p className="mt-1 font-mono text-sm text-loss">{formatEV(s.row.ev)} EV</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div><p className="text-[10px] uppercase tracking-[.18em] text-muted">Full card</p><h2 className="font-display text-3xl">Tonight's board</h2></div>
        {featured.bouts.map((bout) => {
          const a = fighterById(bout.fighterA);
          const b = fighterById(bout.fighterB);
          const sim = summaries[bout.id];
          const board = sim ? buildBoard(bout, a, b, sim, bankroll, kelly) : [];
          const top = [...board].filter((r) => r.ev > 0).sort((x, y) => y.ev - x.ev)[0];
          return <FightRow key={bout.id} bout={bout} event={featured} a={a} b={b} sim={sim} topBet={top} />;
        })}
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Upcoming</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((e) => (
            <Link
              key={e.id}
              to="/event/$eventId"
              params={{ eventId: e.id }}
              className="rounded-xl border border-line bg-surface p-5 hover:border-line-strong"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">{formatDate(e.date)}</p>
              <p className="mt-1 font-display text-xl font-semibold">{eventTitle(e)}</p>
              <p className="mt-1 text-sm text-muted">
                {e.city}
                {e.altitudeFt >= 3000 ? ` · ${e.altitudeFt.toLocaleString()} ft` : ""} · {e.bouts.length} bouts
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniKpi({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) {
  return <div className="metric-glow rounded-xl border border-line bg-bg/55 p-3"><div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.14em] text-subtle">{icon}{label}</div><div className="mt-1 font-mono text-xs font-semibold text-fg">{value}</div></div>;
}
