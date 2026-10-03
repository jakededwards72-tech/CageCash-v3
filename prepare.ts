import type { Fighter, FightContext, Ratings } from "./types";
import { clamp } from "./rng";

export interface LiveFighter {
  id: string;
  label: string;
  stance: Fighter["stance"];
  heightIn: number;
  reachIn: number;
  age: number;
  r: Ratings;
  flags: NonNullable<Fighter["flags"]>;
  sex: Fighter["sex"];
}

function ageCurve(r: Ratings, age: number): Ratings {
  const out = { ...r };
  if (age >= 34) {
    const y = age - 33;
    out.chin = r.chin * (1 - y * 0.028);
    out.speed = r.speed * (1 - y * 0.022);
    out.cardio = r.cardio * (1 - y * 0.02);
    out.explode = r.explode * (1 - y * 0.032);
    out.stkOut = r.stkOut * (1 - y * 0.01);
  }
  if (age >= 38) {
    out.composure = r.composure * 0.96;
    out.chin *= 0.94;
  }
  if (age <= 25) {
    out.iq = r.iq * 0.9;
    out.composure = r.composure * 0.92;
    out.explode = r.explode * 1.05;
    out.speed = r.speed * 1.03;
  }
  return out;
}

function scale(r: Ratings, key: keyof Ratings, m: number) {
  r[key] = clamp(r[key] * m, 8, 99);
}

export function liveFighter(f: Fighter, side: "A" | "B", ctx: FightContext): LiveFighter {
  const r = ageCurve({ ...f.ratings }, f.age);
  const flags = f.flags ?? {};

  if (ctx.altitudeFt >= 2500) {
    const alt = clamp((ctx.altitudeFt - 2500) / 2500, 0, 1.2);
    scale(r, "cardio", 1 - 0.1 * alt);
    scale(r, "pace", 1 - 0.06 * alt);
    scale(r, "stkOut", 1 - 0.04 * alt);
  }
  const short = side === "A" ? ctx.shortNoticeA : ctx.shortNoticeB;
  if (short || flags.shortNotice) {
    scale(r, "cardio", 0.92);
    scale(r, "iq", 0.95);
    scale(r, "composure", 0.93);
  }
  const debut = side === "A" ? ctx.debutA : ctx.debutB;
  if (debut || flags.ufcDebut) {
    scale(r, "composure", 0.9);
    scale(r, "iq", 0.94);
    scale(r, "tdDef", 0.96);
  }
  if (ctx.rounds === 5 && f.record.w + f.record.l < 12) {
    scale(r, "cardio", 0.96);
  }

  return {
    id: f.id,
    label: f.last,
    stance: f.stance,
    heightIn: f.heightIn,
    reachIn: f.reachIn,
    age: f.age,
    r,
    flags,
    sex: f.sex,
  };
}

export interface MatchupMods {
  reachGap: number;
  openStance: boolean;
  wrestlerVsStriker: number;
  powerChinA: number;
  powerChinB: number;
  altitude: number;
  notes: string[];
}

export function matchupMods(a: LiveFighter, b: LiveFighter, ctx: FightContext): MatchupMods {
  const notes: string[] = [];
  const reachGap = a.reachIn - b.reachIn;
  if (Math.abs(reachGap) >= 3) {
    notes.push(
      `${reachGap > 0 ? a.label : b.label} holds a ${Math.abs(reachGap).toFixed(0)}" reach edge — that's a real tax at range, not a Wikipedia line.`,
    );
  }
  const openStance =
    (a.stance === "southpaw" && b.stance === "orthodox") ||
    (b.stance === "southpaw" && a.stance === "orthodox") ||
    a.stance === "switch" ||
    b.stance === "switch";
  if (openStance) {
    notes.push("Open-stance look: lead-hand and calf-kick lanes open, head-kick door exists on the open side.");
  }
  const wrestleA = a.r.tdOff + a.r.chain - (a.r.stkOut + a.r.kicks) / 2;
  const wrestleB = b.r.tdOff + b.r.chain - (b.r.stkOut + b.r.kicks) / 2;
  const wrestlerVsStriker = wrestleA - wrestleB;
  if (Math.abs(wrestlerVsStriker) > 18) {
    notes.push(
      wrestlerVsStriker > 0
        ? `${a.label} should be dragging this into a wrestling tax. If they don't shoot, they're leaving the fight on the table.`
        : `${b.label} is the wrestler in the room. Standing and trading is a choice, not a necessity.`,
    );
  }
  if (a.flags.pressureWrestler && b.flags.counterStriker) {
    notes.push("Pressure wrestler vs counter striker: the first failed shot is the most expensive moment of the night.");
  }
  if (a.flags.decisionWrestler || b.flags.decisionWrestler) {
    notes.push("A decision-wrestler is in here. Markets overprice their finishes; the sim does not.");
  }
  if (ctx.altitudeFt >= 4000) {
    notes.push(
      `Altitude: ${ctx.altitudeFt.toLocaleString()} ft. Late-round output is a different sport. Volume fighters without a real cardio base get exposed after 9:00.`,
    );
  }
  if (ctx.rounds === 5) {
    notes.push("Championship time: round 4 is where fake cardio goes to die.");
  }
  return {
    reachGap,
    openStance,
    wrestlerVsStriker,
    powerChinA: a.r.power / Math.max(28, b.r.chin),
    powerChinB: b.r.power / Math.max(28, a.r.chin),
    altitude: ctx.altitudeFt,
    notes,
  };
}
