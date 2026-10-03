import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineBoard } from "@/components/line-board";
import { ProbBar } from "@/components/prob-bar";
import { StatCompare } from "@/components/stat-compare";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoutSim } from "@/hooks/use-card-sims";
import { writeTape } from "@/lib/mma/analysis";
import { buildBoard, fairAmerican, formatAmerican, formatPct, noVigPair } from "@/lib/mma/betting";
import { displayName, recordString } from "@/lib/mma/fighters";
import { billingLabel, formatDateLong, inches } from "@/lib/mma/format";
import { liveFighter } from "@/lib/mma/prepare";
import { boutById } from "@/lib/mma/run";
import { fightContextFor, mulberry32, simulateOnce, hashSeed } from "@/lib/mma";
import { useDesk } from "@/lib/mma/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fight/$fightId")({ component: FightPage });

type Tab = "tape" | "board" | "sim" | "replay";

function FightPage() {
  const { fightId } = Route.useParams();
  const resolved = boutById(fightId);
  const { summary, running, n } = useBoutSim(resolved?.bout ?? null);
  const bankroll = useDesk((s) => s.bankroll);
  const kelly = useDesk((s) => s.kelly);
  const [tab, setTab] = useState<Tab>("tape");
  const [filter, setFilter] = useState<"all" | "plus" | "ml" | "method" | "rounds">("all");

  const board = useMemo(() => {
    if (!resolved || !summary) return [];
    return buildBoard(resolved.bout, resolved.a, resolved.b, summary, bankroll, kelly);
  }, [resolved, summary, bankroll, kelly]);

  const tape = useMemo(() => {
    if (!resolved || !summary) return null;
    return writeTape(resolved.event, resolved.bout, resolved.a, resolved.b, summary, board);
  }, [resolved, summary, board]);

  const replay = useMemo(() => {
    if (!resolved) return null;
    const ctx = fightContextFor(
      resolved.bout.rounds,
      resolved.event.altitudeFt,
      resolved.bout.title,
      resolved.a,
      resolved.b,
    );
    const rng = mulberry32(hashSeed(`${resolved.bout.id}:showcase`));
    return simulateOnce(resolved.a, resolved.b, ctx, rng, true);
  }, [resolved]);

  if (!resolved) {
    return (
      <div>
        <h1 className="font-display text-3xl">Fight not on the board</h1>
        <Link to="/" className="text-sm text-muted">
          Back to desk
        </Link>
      </div>
    );
  }

  const { bout, event, a, b } = resolved;
  const ctx = fightContextFor(bout.rounds, event.altitudeFt, bout.title, a, b);
  const la = liveFighter(a, "A", ctx);
  const lb = liveFighter(b, "B", ctx);
  const [nvA] = noVigPair(bout.market.mlA, bout.market.mlB);


  const methodData = summary
    ? [
        { name: `${a.last} KO`, v: summary.methods.koA, fill: "var(--color-red-corner)" },
        { name: `${a.last} SUB`, v: summary.methods.subA, fill: "#9a6a62" },
        { name: `${a.last} DEC`, v: summary.methods.decA, fill: "#6a3d38" },
        { name: `${b.last} KO`, v: summary.methods.koB, fill: "var(--color-blue-corner)" },
        { name: `${b.last} SUB`, v: summary.methods.subB, fill: "#6d8498" },
        { name: `${b.last} DEC`, v: summary.methods.decB, fill: "#3d5366" },
      ]
    : [];
  const roundData = summary
    ? [1, 2, 3, 4, 5].filter((r) => r <= bout.rounds).map((r) => ({ r: `R${r}`, p: (summary.endRound[r] ?? 0) * 100 }))
    : [];

  const tabs: { id: Tab; label: string }[] = [
    { id: "tape", label: "Tape" },
    { id: "board", label: "Lines" },
    { id: "sim", label: "Sim" },
    { id: "replay", label: "Replay" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted">
        <Link to="/event/$eventId" params={{ eventId: event.id }} className="hover:text-fg">
          {event.name}
        </Link>
        <span className="text-subtle"> / {formatDateLong(event.date)}</span>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge>{billingLabel(bout.billing)}</Badge>
          {bout.title && <Badge tone="warn">Title</Badge>}
          <Badge tone="neutral">{bout.weight}</Badge>
          {event.altitudeFt >= 3500 && <Badge tone="warn">{event.altitudeFt.toLocaleString()} ft</Badge>}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <FighterHeader f={a} odds={bout.market.mlA} align="left" />
          <FighterHeader f={b} odds={bout.market.mlB} align="right" />
        </div>
        <div className="mt-6">
          {summary ? (
            <ProbBar pA={summary.pA} pB={summary.pB} labelA={a.last} labelB={b.last} />
          ) : (
            <ProbBar pA={nvA} pB={1 - nvA} labelA="mkt" labelB="mkt" />
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono text-muted">
            {summary ? (
              <>
                <span>
                  Fair {a.last} {formatAmerican(fairAmerican(summary.pA))}
                </span>
                <span>
                  Fair {b.last} {formatAmerican(fairAmerican(summary.pB))}
                </span>
                <span>
                  CI {formatPct(summary.ciA[0])}–{formatPct(summary.ciA[1])}
                </span>
                <span>{n.toLocaleString()} paths</span>
              </>
            ) : (
              <span>{running ? "Running the cage…" : "Waiting"}</span>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-1 rounded-md bg-surface p-1 border border-line w-full overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 flex-1 min-w-20 rounded-sm text-sm font-medium",
              tab === t.id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tape" && (
        <div className="space-y-5">
          {!tape || running ? (
            <p className="text-sm text-muted">Waiting on the simulation…</p>
          ) : (
            <>
              <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{tape.lean}</p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl">{tape.headline}</h2>
                <div className="mt-5 space-y-4 text-sm text-fg/90 leading-relaxed">
                  {tape.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <PathCard title={`${a.last} — path`} items={tape.pathsA} />
                <PathCard title={`${b.last} — path`} items={tape.pathsB} />
              </div>
              <div className="rounded-xl border border-line bg-surface p-5">
                <h3 className="font-display text-lg mb-3">Tactical keys</h3>
                <ul className="space-y-2 text-sm text-muted">
                  {tape.keys.map((k) => (
                    <li key={k} className="pl-3 border-l border-line">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
              {tape.fade.length > 0 && (
                <div className="rounded-xl border border-line bg-surface p-5">
                  <h3 className="font-display text-lg mb-3">Fade these</h3>
                  <ul className="space-y-2 text-sm text-loss/90">
                    {tape.fade.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "board" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "plus", "ml", "method", "rounds"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "primary" : "outline"} onClick={() => setFilter(f)}>
                {f === "plus" ? "+EV" : f}
              </Button>
            ))}
          </div>
          {summary ? (
            <LineBoard rows={board} boutId={bout.id} eventId={event.id} filter={filter} />
          ) : (
            <p className="text-sm text-muted">Pricing after the sim lands.</p>
          )}
        </div>
      )}

      {tab === "sim" && (
        <div className="space-y-5">
          <StatCompare a={la.r} b={lb.r} aName={a.last} bName={b.last} />
          {summary && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Go the distance" value={formatPct(summary.goesDistance)} />
                <Stat label="R1 finish" value={formatPct(summary.earlyFinish)} />
                <Stat label="Split rate" value={formatPct(summary.splitRate)} />
                <Stat
                  label="Ground share"
                  value={formatPct(
                    summary.pos.ground / (summary.pos.standup + summary.pos.clinch + summary.pos.ground || 1),
                  )}
                />
                <Stat label={`${a.last} sig strikes`} value={summary.avgSigA.toFixed(1)} />
                <Stat label={`${b.last} sig strikes`} value={summary.avgSigB.toFixed(1)} />
                <Stat label={`${a.last} TDs`} value={summary.avgTdA.toFixed(2)} />
                <Stat label={`${b.last} TDs`} value={summary.avgTdB.toFixed(2)} />
                <Stat label={`${a.last} win | TD`} value={formatPct(summary.pAGivenTdA)} />
                <Stat label={`${b.last} win | TD`} value={formatPct(summary.pBGivenTdB)} />
                <Stat label={`${a.last} if standup`} value={formatPct(summary.pAIfStanding)} />
                <Stat label={`${b.last} if standup`} value={formatPct(summary.pBIfStanding)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface p-4 h-72">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted mb-2">Method mix</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodData} layout="vertical" margin={{ left: 24, right: 8, top: 8, bottom: 8 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#8a8a86", fontSize: 11 }} />
                      <RTooltip
                        formatter={(v: number | string) => formatPct(Number(v))}
                        contentStyle={{ background: "#141416", border: "1px solid #2a2a2e", fontSize: 12 }}
                      />
                      <Bar dataKey="v" radius={[0, 4, 4, 0]}>
                        {methodData.map((d) => (
                          <Cell key={d.name} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-xl border border-line bg-surface p-4 h-72">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted mb-2">Ending round</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roundData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                      <XAxis dataKey="r" tick={{ fill: "#8a8a86", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8a8a86", fontSize: 11 }} />
                      <RTooltip
                        formatter={(v: number | string) => `${Number(v).toFixed(1)}%`}
                        contentStyle={{ background: "#141416", border: "1px solid #2a2a2e", fontSize: 12 }}
                      />
                      <Bar dataKey="p" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "replay" && replay && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">One sampled path — not the median, a real draw</p>
          <h3 className="mt-2 font-display text-2xl">
            {replay.result.winner === "draw"
              ? "Draw"
              : `${replay.result.winner === "A" ? a.last : b.last} by ${replay.result.method.toUpperCase()}`}
            <span className="text-muted">
              {" "}
              · R{replay.result.round} {formatTime(replay.result.timeSec)}
            </span>
          </h3>
          <p className="mt-2 text-sm text-muted">
            Strikes {replay.result.sigA}–{replay.result.sigB} · TD {replay.result.tdA}–{replay.result.tdB} · Control{" "}
            {Math.round(replay.result.controlA)}s–{Math.round(replay.result.controlB)}s
          </p>
          <ol className="mt-5 space-y-2">
            {replay.events.map((ev, i) => (
              <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
                <span className="font-mono text-xs text-subtle">
                  R{ev.round} {formatTime(ev.sec)}
                </span>
                <span>
                  <span className={ev.who === "A" ? "text-red-corner" : "text-blue-corner"}>
                    {ev.who === "A" ? a.last : b.last}
                  </span>{" "}
                  <span className="text-muted">{ev.kind}</span> {ev.detail}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FighterHeader({
  f,
  odds,
  align,
}: {
  f: import("@/lib/mma/types").Fighter;
  odds: number;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "lg:text-right" : ""}>
      <p className="font-display text-3xl sm:text-4xl font-semibold leading-none">{displayName(f)}</p>
      {f.nickname && <p className="mt-1 text-sm text-muted">“{f.nickname}”</p>}
      <p className="mt-2 text-sm text-muted">
        {recordString(f)}
        {f.ranking ? ` · ${f.ranking === "C" ? "Champion" : `#${f.ranking}`}` : ""} · {f.age} · {f.country}
      </p>
      <p className="text-xs text-subtle mt-1">
        {inches(f.heightIn)} · {f.reachIn}" reach · {f.stance}
      </p>
      <p className="mt-2 font-mono text-lg tabular-nums">{formatAmerican(odds)}</p>
    </div>
  );
}

function PathCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-display text-lg mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-muted">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className="mt-1 font-mono text-xl tabular-nums">{value}</p>
    </div>
  );
}
