import type { BetMarket, Bout, Fighter, LineRow, PropBoard, SimSummary } from "./types";
import { clamp } from "./rng";

export function americanToDecimal(american: number): number {
  if (american < 0) return 1 + 100 / Math.abs(american);
  return 1 + american / 100;
}

export function decimalToAmerican(dec: number): number {
  if (dec <= 1) return -10000;
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

export function impliedProb(american: number): number {
  if (american < 0) return Math.abs(american) / (Math.abs(american) + 100);
  return 100 / (american + 100);
}

export function fairAmerican(p: number): number {
  const q = clamp(p, 0.004, 0.996);
  return decimalToAmerican(1 / q);
}

export function noVigPair(a: number, b: number): [number, number] {
  const pa = impliedProb(a);
  const pb = impliedProb(b);
  const s = pa + pb;
  if (s <= 0) return [0.5, 0.5];
  return [pa / s, pb / s];
}

export function expectedValue(modelP: number, american: number): number {
  return modelP * americanToDecimal(american) - 1;
}

export function kellyFraction(modelP: number, american: number): number {
  const b = americanToDecimal(american) - 1;
  if (b <= 0) return 0;
  const f = (b * modelP - (1 - modelP)) / b;
  return f > 0 ? f : 0;
}

export function suggestedStake(
  modelP: number,
  american: number,
  bankroll: number,
  kellyMult: number,
): number {
  const f = kellyFraction(modelP, american) * kellyMult;
  const capped = Math.min(f, 0.05);
  const raw = bankroll * capped;
  if (raw < 0.5) return 0;
  return Math.round(raw * 100) / 100;
}

export function overround(odds: number[]): number {
  return odds.reduce((s, o) => s + impliedProb(o), 0);
}

export function formatAmerican(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
}

export function formatPct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

export function formatEV(ev: number): string {
  const s = (ev * 100).toFixed(1);
  return ev >= 0 ? `+${s}%` : `${s}%`;
}

export function tagFor(ev: number, model: number, implied: number): LineRow["tag"] {
  if (ev >= 0.05 && model > implied + 0.02) return "best";
  if (ev >= 0.025) return "value";
  if (ev <= -0.08 && implied > model + 0.04) return "trap";
  if (Math.abs(ev) < 0.025) return "fair";
  return "pass";
}

const MARKET_LABEL: Record<BetMarket, (a: string, b: string) => string> = {
  mlA: (a) => `${a} ML`,
  mlB: (_a, b) => `${b} ML`,
  koA: (a) => `${a} by KO/TKO`,
  subA: (a) => `${a} by submission`,
  decA: (a) => `${a} by decision`,
  koB: (_a, b) => `${b} by KO/TKO`,
  subB: (_a, b) => `${b} by submission`,
  decB: (_a, b) => `${b} by decision`,
  over25: () => "Over 2.5 rounds",
  under25: () => "Under 2.5 rounds",
  goesDistance: () => "Goes the distance",
  doesntGoDistance: () => "Doesn't go the distance",
  round1: () => "Fight ends in round 1",
  round2: () => "Fight ends in round 2",
  round3: () => "Fight ends in round 3",
  round4: () => "Fight ends in round 4",
  round5: () => "Fight ends in round 5",
};

export function modelProb(summary: SimSummary, market: BetMarket): number {
  const m = summary.methods;
  const r = summary.endRound;
  switch (market) {
    case "mlA":
      return summary.pA;
    case "mlB":
      return summary.pB;
    case "koA":
      return m.koA;
    case "subA":
      return m.subA;
    case "decA":
      return m.decA;
    case "koB":
      return m.koB;
    case "subB":
      return m.subB;
    case "decB":
      return m.decB;
    case "over25":
      return 1 - ((r[1] ?? 0) + (r[2] ?? 0));
    case "under25":
      return (r[1] ?? 0) + (r[2] ?? 0);
    case "goesDistance":
      return summary.goesDistance;
    case "doesntGoDistance":
      return 1 - summary.goesDistance;
    case "round1":
      return r[1] ?? 0;
    case "round2":
      return r[2] ?? 0;
    case "round3":
      return r[3] ?? 0;
    case "round4":
      return r[4] ?? 0;
    case "round5":
      return r[5] ?? 0;
  }
}

function juice(american: number, extra = 0.04): number {
  const p = impliedProb(american);
  const juiced = clamp(p + extra, 0.02, 0.97);
  return fairAmerican(juiced);
}

/**
 * Sportsbook prop model — deliberately coarser than the cage sim.
 * Career finish mix + moneyline favorite, then heavy juice.
 * Edges exist because this is not the same model as the Monte Carlo.
 */
export function bookmakerProps(a: Fighter, b: Fighter, bout: Bout): PropBoard {
  const [fairA] = noVigPair(bout.market.mlA, bout.market.mlB);
  const fightsA = Math.max(1, a.record.w + a.record.l);
  const fightsB = Math.max(1, b.record.w + b.record.l);
  const finA = (a.koWins + a.subWins) / fightsA;
  const finB = (b.koWins + b.subWins) / fightsB;
  const koShareA = a.koWins + a.subWins > 0 ? a.koWins / (a.koWins + a.subWins) : 0.65;
  const koShareB = b.koWins + b.subWins > 0 ? b.koWins / (b.koWins + b.subWins) : 0.65;

  const finish = clamp(0.22 + 0.45 * ((finA + finB) / 2) + Math.abs(fairA - 0.5) * 0.15, 0.18, 0.78);
  const favFinishesMore = fairA > 0.5 ? 0.62 : 0.38;
  const aFinish = finish * (fairA * 0.55 + favFinishesMore * 0.45);
  const bFinish = finish - aFinish;
  const koA = aFinish * (0.35 + koShareA * 0.6);
  const subA = aFinish - koA;
  const koB = bFinish * (0.35 + koShareB * 0.6);
  const subB = bFinish - koB;
  const decA = Math.max(0.04, fairA - aFinish);
  const decB = Math.max(0.04, 1 - fairA - bFinish - 0.01);

  const r1 = finish * 0.38;
  const r2 = finish * 0.28;
  const r3 = finish * (bout.rounds === 5 ? 0.16 : 0.34);
  const r4 = bout.rounds === 5 ? finish * 0.1 : 0;
  const r5 = bout.rounds === 5 ? finish * 0.08 : 0;
  const dist = clamp(1 - finish, 0.12, 0.82);

  const board: PropBoard = {
    koA: juice(fairAmerican(koA), 0.035),
    subA: juice(fairAmerican(Math.max(subA, 0.03)), 0.04),
    decA: juice(fairAmerican(decA), 0.035),
    koB: juice(fairAmerican(koB), 0.035),
    subB: juice(fairAmerican(Math.max(subB, 0.03)), 0.04),
    decB: juice(fairAmerican(decB), 0.035),
    over25: juice(fairAmerican(1 - r1 - r2), 0.03),
    under25: juice(fairAmerican(r1 + r2), 0.03),
    goesDistance: juice(fairAmerican(dist), 0.03),
    doesntGoDistance: juice(fairAmerican(1 - dist), 0.03),
    round1: juice(fairAmerican(r1), 0.045),
    round2: juice(fairAmerican(r2), 0.045),
    round3: juice(fairAmerican(r3), 0.045),
  };
  if (bout.rounds === 5) {
    board.round4 = juice(fairAmerican(Math.max(r4, 0.04)), 0.05);
    board.round5 = juice(fairAmerican(Math.max(r5, 0.04)), 0.05);
  }
  return { ...board, ...bout.market.props };
}

export function buildBoard(
  bout: Bout,
  a: Fighter,
  b: Fighter,
  summary: SimSummary,
  bankroll: number,
  kellyMult: number,
): LineRow[] {
  const props = bookmakerProps(a, b, bout);
  const aName = `${a.last}`;
  const bName = `${b.last}`;
  const markets: { market: BetMarket; american: number }[] = [
    { market: "mlA", american: bout.market.mlA },
    { market: "mlB", american: bout.market.mlB },
    { market: "koA", american: props.koA },
    { market: "subA", american: props.subA },
    { market: "decA", american: props.decA },
    { market: "koB", american: props.koB },
    { market: "subB", american: props.subB },
    { market: "decB", american: props.decB },
    { market: "over25", american: props.over25 },
    { market: "under25", american: props.under25 },
    { market: "goesDistance", american: props.goesDistance },
    { market: "doesntGoDistance", american: props.doesntGoDistance },
    { market: "round1", american: props.round1 },
    { market: "round2", american: props.round2 },
    { market: "round3", american: props.round3 },
  ];
  if (bout.rounds === 5 && props.round4 && props.round5) {
    markets.push(
      { market: "round4", american: props.round4 },
      { market: "round5", american: props.round5 },
    );
  }

  return markets.map(({ market, american }) => {
    const model = modelProb(summary, market);
    const implied = impliedProb(american);
    const ev = expectedValue(model, american);
    const kelly = kellyFraction(model, american);
    return {
      market,
      label: MARKET_LABEL[market](aName, bName),
      american,
      implied,
      fairImplied: model,
      model,
      ev,
      kelly,
      stake: suggestedStake(model, american, bankroll, kellyMult),
      tag: tagFor(ev, model, implied),
    };
  });
}

export function vigOnMl(mlA: number, mlB: number): number {
  return overround([mlA, mlB]) - 1;
}
