import { createFileRoute, Link } from "@tanstack/react-router";
import { FightRow } from "@/components/fight-row";
import { Badge } from "@/components/ui/badge";
import { useCardSims } from "@/hooks/use-card-sims";
import { buildBoard, formatEV } from "@/lib/mma/betting";
import { EVENT_BY_ID } from "@/lib/mma/cards";
import { fighterById } from "@/lib/mma/fighters";
import { eventTitle, formatDateLong } from "@/lib/mma/format";
import { useDesk } from "@/lib/mma/store";

export const Route = createFileRoute("/event/$eventId")({ component: EventPage });

function EventPage() {
  const { eventId } = Route.useParams();
  const event = EVENT_BY_ID[eventId];
  const bankroll = useDesk((s) => s.bankroll);
  const kelly = useDesk((s) => s.kelly);
  const { summaries, running, progress, total, n } = useCardSims(event?.bouts ?? []);

  if (!event) {
    return (
      <div>
        <h1 className="font-display text-3xl">Card not found</h1>
        <Link to="/" className="text-sm text-muted">
          Back to desk
        </Link>
      </div>
    );
  }

  const edges = event.bouts.flatMap((bout) => {
    const sim = summaries[bout.id];
    if (!sim) return [];
    const a = fighterById(bout.fighterA);
    const b = fighterById(bout.fighterB);
    return buildBoard(bout, a, b, sim, bankroll, kelly)
      .filter((r) => r.tag === "best" || r.tag === "value" || r.tag === "trap")
      .map((row) => ({ bout, a, b, row }));
  });
  const best = edges.filter((e) => e.row.ev > 0).sort((x, y) => y.row.ev - x.row.ev);
  const traps = edges.filter((e) => e.row.tag === "trap").sort((x, y) => x.row.ev - y.row.ev);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{formatDateLong(event.date)}</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">{eventTitle(event)}</h1>
        <p className="mt-2 text-sm text-muted">
          {event.venue}, {event.city}
          {event.altitudeFt >= 2500 ? ` · altitude ${event.altitudeFt.toLocaleString()} ft` : ""}
        </p>
        <p className="mt-1 text-xs text-subtle">{event.timezoneNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{event.bouts.length} bouts</Badge>
          <Badge tone={running ? "warn" : "edge"}>
            {running ? `Simulating ${progress}/${total}` : `${n.toLocaleString()} paths / bout`}
          </Badge>
        </div>
      </div>

      {best.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-3">Value on this card</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {best.slice(0, 6).map((e) => (
              <Link
                key={e.bout.id + e.row.market}
                to="/fight/$fightId"
                params={{ fightId: e.bout.id }}
                className="rounded-lg border border-line bg-surface p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                  {e.a.last} vs {e.b.last}
                </p>
                <p className="mt-1 font-medium">{e.row.label}</p>
                <p className="font-mono text-sm text-edge">{formatEV(e.row.ev)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {traps.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-3">Fades</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {traps.slice(0, 4).map((e) => (
              <Link
                key={e.bout.id + e.row.market}
                to="/fight/$fightId"
                params={{ fightId: e.bout.id }}
                className="rounded-lg border border-line bg-surface p-4"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">
                  {e.a.last} vs {e.b.last}
                </p>
                <p className="mt-1 font-medium">{e.row.label}</p>
                <p className="font-mono text-sm text-loss">{formatEV(e.row.ev)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        {event.bouts.map((bout) => (
          <FightRow
            key={bout.id}
            bout={bout}
            event={event}
            a={fighterById(bout.fighterA)}
            b={fighterById(bout.fighterB)}
            sim={summaries[bout.id]}
            topBet={
              summaries[bout.id]
                ? buildBoard(
                    bout,
                    fighterById(bout.fighterA),
                    fighterById(bout.fighterB),
                    summaries[bout.id]!,
                    bankroll,
                    kelly,
                  )
                    .filter((r) => r.ev > 0)
                    .sort((x, y) => y.ev - x.ev)[0]
                : undefined
            }
          />
        ))}
      </section>
    </div>
  );
}
