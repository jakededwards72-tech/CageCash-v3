import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LineBoard } from "@/components/line-board";
import { ProbBar } from "@/components/prob-bar";
import { StatCompare } from "@/components/stat-compare";
import { Button } from "@/components/ui/button";
import { writeTape } from "@/lib/mma/analysis";
import { buildBoard, fairAmerican, formatAmerican, formatPct } from "@/lib/mma/betting";
import { FIGHTERS, displayName, searchFighters } from "@/lib/mma/fighters";
import { liveFighter } from "@/lib/mma/prepare";
import { fightContextFor, hashSeed, simulateNAsync } from "@/lib/mma";
import { useDesk } from "@/lib/mma/store";
import type { Bout, EventCard, Fighter, SimSummary } from "@/lib/mma/types";

export const Route = createFileRoute("/lab")({ component: Lab });

function Lab() {
  const [aId, setAId] = useState("alexander-volkanovski");
  const [bId, setBId] = useState("movsar-evloev");
  const [rounds, setRounds] = useState<3 | 5>(5);
  const [alt, setAlt] = useState(0);
  const [n, setN] = useState(8000);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<SimSummary | null>(null);
  const bankroll = useDesk((s) => s.bankroll);
  const kelly = useDesk((s) => s.kelly);

  const a = FIGHTERS.find((f) => f.id === aId);
  const b = FIGHTERS.find((f) => f.id === bId);

  const fake = useMemo(() => {
    if (!a || !b) return null;
    const event: EventCard = {
      id: "lab",
      name: "Lab",
      subtitle: "Hypothetical",
      date: "2026-10-03",
      venue: "The Cage",
      city: alt ? `Altitude ${alt} ft` : "Sea level",
      altitudeFt: alt,
      timezoneNote: "",
      bouts: [],
    };
    const bout: Bout = {
      id: `lab-${a.id}-${b.id}-${rounds}-${alt}`,
      eventId: "lab",
      weight: a.division,
      division: a.division,
      rounds,
      title: rounds === 5,
      billing: "main-event",
      fighterA: a.id,
      fighterB: b.id,
      market: {
        mlA: fairAmerican(0.52),
        mlB: fairAmerican(0.48),
      },
    };
    return { event, bout, a, b };
  }, [a, b, rounds, alt]);

  async function run() {
    if (!fake) return;
    setRunning(true);
    const ctx = fightContextFor(rounds, alt, rounds === 5, fake.a, fake.b);
    const seed = hashSeed(`lab:${fake.a.id}:${fake.b.id}:${rounds}:${alt}:${n}`);
    const s = await simulateNAsync(fake.a, fake.b, ctx, n, seed);
    fake.bout.market = {
      mlA: fairAmerican(Math.max(0.08, s.pA - 0.02)),
      mlB: fairAmerican(Math.max(0.08, s.pB - 0.02)),
    };
    setSummary(s);
    setRunning(false);
  }

  const board = fake && summary ? buildBoard(fake.bout, fake.a, fake.b, summary, bankroll, kelly) : [];
  const tape = fake && summary ? writeTape(fake.event, fake.bout, fake.a, fake.b, summary, board) : null;
  const ctx = fake ? fightContextFor(rounds, alt, rounds === 5, fake.a, fake.b) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Lab</h1>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Hypotheticals. Same engine, no book. We invent a slightly juiced market around the model so you can still see
          how props would be mispriced.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FighterPick label="Red corner" value={aId} onChange={setAId} exclude={bId} />
        <FighterPick label="Blue corner" value={bId} onChange={setBId} exclude={aId} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Rounds
          <select
            className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value) as 3 | 5)}
          >
            <option value={3}>3 rounds</option>
            <option value={5}>5 rounds</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Altitude
          <select
            className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            value={alt}
            onChange={(e) => setAlt(Number(e.target.value))}
          >
            <option value={0}>Sea level</option>
            <option value={2003}>Las Vegas · 2,003 ft</option>
            <option value={4226}>Salt Lake · 4,226 ft</option>
            <option value={5280}>Mile high · 5,280 ft</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Paths
          <select
            className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          >
            <option value={3000}>3,000</option>
            <option value={8000}>8,000</option>
            <option value={15000}>15,000</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button className="w-full" onClick={run} disabled={running || !a || !b || a.id === b.id}>
            {running ? "Running…" : "Run the cage"}
          </Button>
        </div>
      </div>

      {a && b && a.sex !== b.sex && (
        <p className="text-sm text-loss">Cross-sex matchup. The engine will still run numbers. Don't pretend it's a card.</p>
      )}

      {summary && fake && ctx && (
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-2xl">
              {displayName(fake.a)} vs {displayName(fake.b)}
            </h2>
            <div className="mt-4">
              <ProbBar pA={summary.pA} pB={summary.pB} labelA={fake.a.last} labelB={fake.b.last} />
            </div>
            <p className="mt-3 text-xs font-mono text-muted">
              Fair {formatAmerican(fairAmerican(summary.pA))} / {formatAmerican(fairAmerican(summary.pB))} · distance{" "}
              {formatPct(summary.goesDistance)} · {n.toLocaleString()} paths
            </p>
          </div>
          {tape && (
            <div className="rounded-xl border border-line bg-surface p-5 space-y-3">
              <h3 className="font-display text-xl">{tape.headline}</h3>
              {tape.paragraphs.slice(0, 4).map((p) => (
                <p key={p.slice(0, 24)} className="text-sm text-muted leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}
          <StatCompare a={liveFighter(fake.a, "A", ctx).r} b={liveFighter(fake.b, "B", ctx).r} aName={fake.a.last} bName={fake.b.last} />
          <LineBoard rows={board} boutId={fake.bout.id} eventId="lab" filter="all" />
        </div>
      )}
    </div>
  );
}

function FighterPick({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  exclude: string;
}) {
  const [q, setQ] = useState("");
  const list = searchFighters(q).filter((f) => f.id !== exclude).slice(0, 12);
  const selected = FIGHTERS.find((f) => f.id === value);
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      {selected && <p className="mt-1 font-display text-2xl">{displayName(selected)}</p>}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search roster"
        className="mt-3 h-11 w-full rounded-md border border-line bg-bg px-3 text-sm"
      />
      <ul className="mt-2 max-h-48 overflow-y-auto divide-y divide-line">
        {list.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => {
                onChange(f.id);
                setQ("");
              }}
              className="flex w-full items-center justify-between py-2 text-left text-sm hover:text-accent"
            >
              <span>{displayName(f)}</span>
              <span className="text-xs text-subtle">{f.division.replace("womens-", "W ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
