import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, Gauge, Hexagon, Settings2, X, Radar, FlaskConical, ChartNoAxesCombined, House } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { americanToDecimal, formatAmerican, formatEV } from "@/lib/mma/betting";
import { useDesk } from "@/lib/mma/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Desk", icon: House },
  { to: "/scanner", label: "Scanner", icon: Radar },
  { to: "/lab", label: "Lab", icon: FlaskConical },
  { to: "/model", label: "Model", icon: ChartNoAxesCombined },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { bankroll, kelly, simCount, setBankroll, setKelly, setSimCount, slip, removeBet, clearSlip, updateStake } =
    useDesk();
  const [settings, setSettings] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);
  const parlayDec = slip.reduce((acc, b) => acc * americanToDecimal(b.american), 1);
  const parlayP = slip.reduce((acc, b) => acc * b.model, 1);
  const parlayEv = slip.length > 1 ? parlayP * parlayDec - 1 : 0;
  const stakeSum = slip.reduce((s, b) => s + b.stake, 0);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid size-8 place-items-center rounded-xl border border-accent/30 bg-accent/10"><Hexagon className="size-4 text-accent" strokeWidth={2} /></span><div><span className="block font-display text-lg font-bold tracking-[0.12em] leading-none">CAGECASH</span><span className="hidden sm:block mt-1 text-[8px] uppercase tracking-[.2em] text-subtle">MMA Intelligence</span></div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "h-9 px-3 rounded-sm text-sm font-medium transition-colors",
                  pathname === n.to ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                <n.icon className="size-4" />{n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSlipOpen(true)}
              className="hidden sm:flex h-9 items-center gap-2 rounded-sm border border-line px-3 text-xs text-muted hover:text-fg"
            >
              <ClipboardList className="size-3.5" />
              Slip {slip.length ? `(${slip.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setSettings((v) => !v)}
              className="flex h-9 items-center gap-2 rounded-sm border border-line px-3 text-xs font-mono tabular-nums text-muted hover:text-fg"
            >
              <Gauge className="size-3.5" />
              ${bankroll.toLocaleString()}
            </button>
            <Button variant="ghost" size="icon" className="size-9" onClick={() => setSettings((v) => !v)} aria-label="Settings">
              <Settings2 className="size-4" />
            </Button>
          </div>
        </div>
        {settings && (
          <div className="border-t border-line bg-surface">
            <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 sm:grid-cols-3">
              <label className="block text-xs text-muted">
                Bankroll
                <input
                  type="number"
                  min={50}
                  className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 font-mono text-sm text-fg"
                  value={bankroll}
                  onChange={(e) => setBankroll(Number(e.target.value) || 0)}
                />
              </label>
              <label className="block text-xs text-muted">
                Kelly fraction
                <select
                  className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
                  value={kelly}
                  onChange={(e) => setKelly(Number(e.target.value))}
                >
                  <option value={0.1}>Tenth Kelly</option>
                  <option value={0.25}>Quarter Kelly</option>
                  <option value={0.5}>Half Kelly</option>
                  <option value={1}>Full Kelly (don't)</option>
                </select>
              </label>
              <label className="block text-xs text-muted">
                Simulations per fight
                <select
                  className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-sm text-fg"
                  value={simCount}
                  onChange={(e) => setSimCount(Number(e.target.value))}
                >
                  <option value={3000}>3,000 — fast</option>
                  <option value={8000}>8,000 — desk default</option>
                  <option value={15000}>15,000 — tight CI</option>
                  <option value={25000}>25,000 — deep</option>
                </select>
              </label>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:pb-12">{children}</main>

      <footer className="border-t border-line py-8 text-center text-xs text-subtle px-4">
        CAGECASH is a simulation desk, not a book. Lines are a snapshot for education. No wager is placed from here.
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5 h-14">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col gap-1 items-center justify-center text-[9px] uppercase tracking-[0.12em]",
                pathname === n.to ? "text-fg" : "text-muted",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSlipOpen(true)}
            className={cn("flex flex-col gap-1 items-center justify-center text-[9px] uppercase tracking-[0.12em]", slip.length ? "text-fg" : "text-muted")}
          >
            <ClipboardList className="size-4" />
            Slip
          </button>
        </div>
      </nav>

      {slipOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-bg/60" onClick={() => setSlipOpen(false)}>
          <aside
            className="h-full w-full max-w-md border-l border-line bg-surface p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Bet slip</h2>
              <button type="button" onClick={() => setSlipOpen(false)} aria-label="Close slip">
                <X className="size-5 text-muted" />
              </button>
            </div>
            {slip.length === 0 ? (
              <p className="text-sm text-muted">No seats yet. Add a line from a fight board.</p>
            ) : (
              <ul className="space-y-3">
                {slip.map((b) => (
                  <li key={b.id} className="rounded-lg border border-line bg-bg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{b.label}</p>
                        <p className="text-xs text-muted font-mono">
                          {formatAmerican(b.american)} · EV {formatEV(b.ev)}
                        </p>
                      </div>
                      <button type="button" className="text-muted hover:text-loss" onClick={() => removeBet(b.id)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    <label className="mt-2 block text-[11px] text-muted">
                      Stake
                      <input
                        type="number"
                        className="mt-1 h-10 w-full rounded-sm border border-line bg-surface px-2 font-mono text-sm"
                        value={b.stake}
                        onChange={(e) => updateStake(b.id, Number(e.target.value) || 0)}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {slip.length > 0 && (
              <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Straight stake</span>
                  <span className="font-mono tabular-nums text-fg">${stakeSum.toFixed(2)}</span>
                </div>
                {slip.length > 1 && (
                  <div className="flex justify-between text-muted">
                    <span>Same-card parlay EV</span>
                    <span className={cn("font-mono tabular-nums", parlayEv >= 0 ? "text-edge" : "text-loss")}>
                      {formatEV(parlayEv)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-subtle">
                  Same-card fights are treated as independent. That's a decent approximation, not a law of physics.
                </p>
                <Button variant="outline" className="w-full mt-2" onClick={clearSlip}>
                  Clear slip
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
