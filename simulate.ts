import type {
  FightContext,
  FightResult,
  Fighter,
  Method,
  SimSummary,
  TimelineEvent,
} from "./types";
import { chance, clamp, mulberry32, poisson, wilson, type Rng } from "./rng";
import { liveFighter, matchupMods, type LiveFighter } from "./prepare";

const TICK = 15;
const TICKS = 20;

type Pos = "stand" | "clinch" | "guard" | "half" | "side" | "mount" | "back";

interface State {
  a: LiveFighter;
  b: LiveFighter;
  pos: Pos;
  top: 0 | 1 | null;
  stam: [number, number];
  dmg: [number, number];
  mobility: [number, number];
  kd: [number, number];
  sig: [number, number];
  td: [number, number];
  tdAtt: [number, number];
  ctrl: [number, number];
  subAtt: [number, number];
  posSec: [number, number, number];
  rDmg: [number, number];
  rSig: [number, number];
  rCtrl: [number, number];
  rKd: [number, number];
  roundScores: [number, number][];
  finished: boolean;
  result?: FightResult;
  events: TimelineEvent[] | null;
  round: number;
  sec: number;
}

function other(i: 0 | 1): 0 | 1 {
  return i === 0 ? 1 : 0;
}

function F(s: State, i: 0 | 1): LiveFighter {
  return i === 0 ? s.a : s.b;
}

function staminaTax(s: State, i: 0 | 1): number {
  const cardio = F(s, i).r.cardio / 100;
  const raw = s.stam[i];
  const faded = Math.pow(clamp(raw, 0.15, 1), 1.15 - cardio * 0.25);
  return faded;
}

function drain(s: State, i: 0 | 1, amount: number) {
  const cardio = F(s, i).r.cardio / 100;
  s.stam[i] = clamp(s.stam[i] - amount * (1.25 - cardio * 0.7), 0.12, 1);
}

function push(
  s: State,
  kind: TimelineEvent["kind"],
  who: "A" | "B",
  detail: string,
) {
  if (!s.events) return;
  if (s.events.length > 80) return;
  s.events.push({ round: s.round, sec: s.sec, kind, who, detail });
}

function koCheck(
  s: State,
  rng: Rng,
  att: 0 | 1,
  def: 0 | 1,
  powerShot: boolean,
  isKick: boolean,
  isHead: boolean,
): "ko" | "kd" | null {
  if (!isHead && !powerShot) return null;
  const A = F(s, att).r;
  const D = F(s, def).r;
  const stamDef = staminaTax(s, def);
  const chin = Math.max(22, D.chin * (0.55 + stamDef * 0.45) * (1 - s.dmg[def] / 420));
  const pow = A.power * (0.7 + staminaTax(s, att) * 0.3);
  const flash = 0.0018 * Math.pow(pow / 70, 2.1) * (70 / chin) * (powerShot ? 1.6 : 0.7);
  const accum = 0.0045 * Math.pow(pow / chin, 1.5) * (1 + s.dmg[def] / 160);
  const kick = isKick ? 1.28 : 1;
  const head = isHead ? 1 : 0.12;
  const already = 1 + s.kd[def] * 0.35;
  const killer = 0.85 + A.killer / 400;
  const p = (flash + accum) * kick * head * already * killer;
  if (!chance(rng, clamp(p, 0, 0.42))) return null;
  s.kd[att] += 1;
  s.rKd[att] += 1;
  if (chance(rng, 0.5 + A.killer / 280 + (s.dmg[def] > 140 ? 0.12 : 0))) {
    return "ko";
  }
  s.stam[def] *= 0.72;
  s.mobility[def] *= 0.85;
  return "kd";
}

function finish(
  s: State,
  winner: "A" | "B",
  method: Method,
  ctxRounds: number,
) {
  s.finished = true;
  const wi = winner === "A" ? 0 : 1;
  s.result = {
    winner,
    method,
    round: s.round,
    timeSec: s.sec,
    knockdownsA: s.kd[0],
    knockdownsB: s.kd[1],
    sigA: s.sig[0],
    sigB: s.sig[1],
    tdA: s.td[0],
    tdB: s.td[1],
    tdAttA: s.tdAtt[0],
    tdAttB: s.tdAtt[1],
    controlA: s.ctrl[0],
    controlB: s.ctrl[1],
    subAttA: s.subAtt[0],
    subAttB: s.subAtt[1],
    standupSec: s.posSec[0],
    clinchSec: s.posSec[1],
    groundSec: s.posSec[2],
    anyTdA: s.td[0] > 0,
    anyTdB: s.td[1] > 0,
    r1DamageA: 0,
    r1DamageB: 0,
  };
  void ctxRounds;
  void wi;
}

function strikeTick(s: State, rng: Rng, ctx: FightContext, modsReach: number) {
  for (const att of [0, 1] as const) {
    if (s.finished) return;
    const def = other(att);
    const A = F(s, att);
    const D = F(s, def);
    const stam = staminaTax(s, att);
    const rangeTax = att === 0 ? -modsReach : modsReach;
    const closeNeeded = rangeTax < -2 ? 0.85 : 1;
    const volume =
      (0.22 + A.r.stkOut / 95) *
      stam *
      (A.r.pace / 80) *
      closeNeeded *
      (s.pos === "clinch" ? 0.7 : 1);
    if (!chance(rng, clamp(volume * 0.55, 0.08, 0.82))) continue;

    const n = 1 + (chance(rng, 0.42 * stam) ? 1 : 0) + (chance(rng, 0.16 * stam) ? 1 : 0);
    drain(s, att, 0.012 * n);

    for (let k = 0; k < n; k++) {
      if (s.finished) return;
      const isKick = chance(rng, 0.18 + A.r.kicks / 400 + (A.flags.calfKicker ? 0.08 : 0));
      const isHead = chance(rng, isKick ? 0.38 : 0.58 - D.r.stkDef / 500);
      const acc =
        0.28 +
        (A.r.stkAcc - D.r.stkDef) * 0.0032 +
        (A.r.speed - D.r.speed) * 0.0018 -
        D.r.iq * 0.0006 +
        (isKick ? 0.04 : 0) +
        (rangeTax > 3 && !isKick ? -0.05 : 0);
      const landed = chance(rng, clamp(acc, 0.14, 0.58));
      if (!landed) {
        drain(s, def, 0.003);
        continue;
      }
      s.sig[att] += 1;
      s.rSig[att] += 1;
      const powerShot = chance(rng, 0.12 + A.r.power / 280 + (k === n - 1 ? 0.08 : 0) + (A.flags.oneHitter ? 0.06 : 0));
      let dmg = 4.2 + A.r.power * 0.07 + (isKick ? 2.2 : 0) + (powerShot ? 6 : 0);
      dmg *= 0.75 + stam * 0.35;
      if (!isHead) {
        dmg *= 0.72;
        drain(s, def, isKick && A.flags.calfKicker ? 0.018 : 0.012);
        s.mobility[def] *= isKick ? 0.985 : 0.995;
        if (A.flags.bodyAttacker || !isKick) drain(s, def, 0.01);
      }
      s.dmg[def] += dmg;
      s.rDmg[att] += dmg;
      drain(s, def, 0.008 + dmg / 900);

      if (powerShot || isKick) {
        push(s, powerShot ? "power" : "strike", att === 0 ? "A" : "B", isKick ? "kick" : "shot");
      }

      const stop = koCheck(s, rng, att, def, powerShot, isKick, isHead);
      if (stop === "kd") {
        push(s, "kd", att === 0 ? "A" : "B", "knockdown");
        if (s.pos === "stand" && chance(rng, 0.55 + A.r.top / 250)) {
          s.pos = "guard";
          s.top = att;
        }
      } else if (stop === "ko") {
        push(s, "ko", att === 0 ? "A" : "B", "finish");
        finish(s, att === 0 ? "A" : "B", "ko", ctx.rounds);
        return;
      }

      if (s.dmg[def] > 210 && s.stam[def] < 0.38 && chance(rng, 0.04 + (210 - s.stam[def] * 100) / 800)) {
        push(s, "finish", att === 0 ? "A" : "B", "TKO - accumulated");
        finish(s, att === 0 ? "A" : "B", "ko", ctx.rounds);
        return;
      }
    }
  }
}

function takedownAttempt(s: State, rng: Rng, att: 0 | 1, ctx: FightContext) {
  const def = other(att);
  const A = F(s, att);
  const D = F(s, def);
  s.tdAtt[att] += 1;
  const shot =
    0.2 +
    (A.r.tdOff - D.r.tdDef * (s.mobility[def] * 0.55 + 0.45)) * 0.0065 +
    A.r.chain * 0.0015 +
    A.r.explode * 0.0012 -
    D.r.iq * 0.0008 +
    (s.pos === "clinch" ? 0.08 : 0);
  const stuffed = !chance(rng, clamp(shot, 0.08, 0.72));
  drain(s, att, 0.028);
  drain(s, def, 0.022);
  if (stuffed) {
    push(s, "td-stuff", att === 0 ? "A" : "B", "sprawl");
    if (chance(rng, 0.28 + D.r.clinch / 400)) s.pos = "clinch";
    if (D.r.power > 70 && chance(rng, 0.08)) {
      const stop = koCheck(s, rng, def, att, true, false, true);
      if (stop === "ko") {
        finish(s, def === 0 ? "A" : "B", "ko", ctx.rounds);
      } else if (stop === "kd") {
        push(s, "kd", def === 0 ? "A" : "B", "sprawl-counter");
      }
    }
    return;
  }
  s.td[att] += 1;
  s.top = att;
  s.pos = chance(rng, 0.55) ? "half" : "guard";
  push(s, "td", att === 0 ? "A" : "B", "takedown");
  drain(s, def, 0.02);
}

function wrestlingIntent(s: State, i: 0 | 1): number {
  const f = F(s, i);
  const o = F(s, other(i));
  const wrestle = (f.r.tdOff + f.r.chain) / 2 - (f.r.stkOut + f.r.kicks) / 2;
  const losingStand = s.rDmg[other(i)] > s.rDmg[i] + 12;
  const behind = s.round >= 3 && s.roundScores.reduce((acc, sc) => acc + (sc[i] > sc[other(i)] ? 1 : -1), 0) < 0;
  let p = 0.04 + Math.max(0, wrestle) * 0.004 + f.r.tdOff / 500;
  if (f.flags.pressureWrestler) p += 0.06;
  if (losingStand) p += 0.05;
  if (behind) p += 0.07;
  if (o.r.stkDef < 55 && f.r.power > 70) p *= 0.7;
  return clamp(p * staminaTax(s, i), 0.01, 0.38);
}

function clinchTick(s: State, rng: Rng, ctx: FightContext) {
  s.posSec[1] += TICK;
  const t = (s.top ?? (chance(rng, 0.5) ? 0 : 1)) as 0 | 1;
  drain(s, 0, 0.016);
  drain(s, 1, 0.016);
  if (chance(rng, wrestlingIntent(s, t) * 1.6)) {
    takedownAttempt(s, rng, t, ctx);
    return;
  }
  if (chance(rng, 0.22)) {
    s.pos = "stand";
    s.top = null;
    push(s, "stand", t === 0 ? "A" : "B", "break");
    return;
  }
  strikeTick(s, rng, ctx, 0);
}

function groundTick(s: State, rng: Rng, ctx: FightContext) {
  s.posSec[2] += TICK;
  if (s.top === null) s.top = 0;
  const att = s.top;
  const def = other(att);
  const A = F(s, att);
  const D = F(s, def);
  s.ctrl[att] += TICK;
  s.rCtrl[att] += TICK;
  drain(s, att, 0.014);
  drain(s, def, 0.018);

  const adv =
    0.12 +
    (A.r.top - D.r.bottom) * 0.004 +
    A.r.iq * 0.001 -
    D.r.explode * 0.0006;
  const scramble = 0.08 + D.r.bottom * 0.002 + D.r.explode * 0.0015 - A.r.top * 0.001;
  if (chance(rng, clamp(scramble, 0.03, 0.28))) {
    if (chance(rng, 0.45 + D.r.explode / 250)) {
      s.pos = "stand";
      s.top = null;
      push(s, "stand", def === 0 ? "A" : "B", "stand-up");
      return;
    }
    s.pos = "scramble" as Pos;
    if (chance(rng, 0.5)) s.top = def;
    s.pos = "guard";
    return;
  }

  const ladder: Pos[] = ["guard", "half", "side", "mount", "back"];
  const idx = ladder.indexOf(s.pos);
  if (idx >= 0 && idx < ladder.length - 1 && chance(rng, clamp(adv, 0.05, 0.45))) {
    s.pos = ladder[idx + 1]!;
    if (s.pos === "back") push(s, "td", att === 0 ? "A" : "B", "back-take");
  }

  const gnpP = 0.35 + A.r.gnp / 220;
  if (chance(rng, gnpP)) {
    const n = 1 + poisson(rng, 0.8);
    for (let k = 0; k < n; k++) {
      if (chance(rng, 0.55 + A.r.stkAcc / 400)) {
        s.sig[att] += 1;
        s.rSig[att] += 1;
        const dmg = 3.2 + A.r.gnp * 0.06 + (s.pos === "mount" || s.pos === "back" ? 3 : 0);
        s.dmg[def] += dmg;
        s.rDmg[att] += dmg;
        if (s.pos === "mount" || s.pos === "back") {
          const stop = koCheck(s, rng, att, def, true, false, true);
          if (stop === "ko" || (s.dmg[def] > 180 && chance(rng, 0.05))) {
            push(s, "finish", att === 0 ? "A" : "B", "GNP TKO");
            finish(s, att === 0 ? "A" : "B", "ko", ctx.rounds);
            return;
          }
        }
      }
    }
  }

  const subPos =
    s.pos === "back" ? 0.22 + A.r.back / 200 : s.pos === "mount" ? 0.1 : s.pos === "guard" ? 0.04 : 0.06;
  const subP = subPos * (A.r.subOff / 80) * staminaTax(s, att);
  if (chance(rng, clamp(subP, 0, 0.32))) {
    s.subAtt[att] += 1;
    push(s, "sub", att === 0 ? "A" : "B", s.pos === "back" ? "RNC attempt" : "submission attempt");
    const finishP =
      0.12 +
      (A.r.subOff - D.r.subDef) * 0.006 +
      (s.pos === "back" ? 0.16 : 0) +
      A.r.killer * 0.001 -
      D.r.composure * 0.001;
    if (chance(rng, clamp(finishP, 0.04, 0.62))) {
      push(s, "finish", att === 0 ? "A" : "B", "submission");
      finish(s, att === 0 ? "A" : "B", "sub", ctx.rounds);
      return;
    }
  }

  if (s.pos === "guard" && chance(rng, 0.035 + D.r.subOff / 600)) {
    s.subAtt[def] += 1;
    if (chance(rng, 0.1 + (D.r.subOff - A.r.subDef) * 0.004)) {
      finish(s, def === 0 ? "A" : "B", "sub", ctx.rounds);
    }
  }
}

function scoreRound(s: State): [number, number] {
  const dmgDiff = s.rDmg[0] - s.rDmg[1];
  const sigDiff = s.rSig[0] - s.rSig[1];
  const ctrlDiff = s.rCtrl[0] - s.rCtrl[1];
  const kdDiff = s.rKd[0] - s.rKd[1];
  const score =
    dmgDiff * 1.15 + sigDiff * 1.6 + ctrlDiff * 0.08 + kdDiff * 22;
  const abs = Math.abs(score);
  const leader: 0 | 1 = score >= 0 ? 0 : 1;
  const tenEight = abs > 38 && (s.rKd[leader] > 0 || s.rCtrl[leader] > 90 || s.rDmg[leader] > s.rDmg[other(leader)] * 2.2);
  if (abs < 4) return [10, 10];
  if (leader === 0) return tenEight ? [10, 8] : [10, 9];
  return tenEight ? [8, 10] : [9, 10];
}

function judgeNoise(rng: Rng, scores: [number, number][]): [number, number][] {
  return scores.map(([a, b]) => {
    if (a === b) return [a, b] as [number, number];
    if (Math.abs(a - b) >= 2) return [a, b] as [number, number];
    if (chance(rng, 0.08)) return a > b ? ([9, 10] as [number, number]) : ([10, 9] as [number, number]);
    return [a, b] as [number, number];
  });
}

function tally(scores: [number, number][]): [number, number] {
  return scores.reduce((acc, [a, b]) => [acc[0] + a, acc[1] + b], [0, 0]);
}

function decisionOf(s: State, rng: Rng): void {
  const j1 = judgeNoise(rng, s.roundScores);
  const j2 = judgeNoise(rng, s.roundScores);
  const j3 = judgeNoise(rng, s.roundScores);
  const t1 = tally(j1);
  const t2 = tally(j2);
  const t3 = tally(j3);
  const w = (t: [number, number]) => (t[0] > t[1] ? "A" : t[1] > t[0] ? "B" : "draw");
  const winners = [w(t1), w(t2), w(t3)];
  const aVotes = winners.filter((x) => x === "A").length;
  const bVotes = winners.filter((x) => x === "B").length;
  let winner: "A" | "B" | "draw" = "draw";
  let decisionType: FightResult["decisionType"] = "draw";
  if (aVotes === 3) {
    winner = "A";
    decisionType = "ud";
  } else if (bVotes === 3) {
    winner = "B";
    decisionType = "ud";
  } else if (aVotes === 2) {
    winner = "A";
    decisionType = bVotes === 0 ? "md" : "sd";
  } else if (bVotes === 2) {
    winner = "B";
    decisionType = aVotes === 0 ? "md" : "sd";
  }
  s.result = {
    winner,
    method: winner === "draw" ? "draw" : "dec",
    round: s.round,
    timeSec: 300,
    scores: [j1, j2, j3].map((j) => j.map(([a, b]) => ({ a, b }))) as [
      { a: number; b: number }[],
      { a: number; b: number }[],
      { a: number; b: number }[],
    ],
    decisionType,
    knockdownsA: s.kd[0],
    knockdownsB: s.kd[1],
    sigA: s.sig[0],
    sigB: s.sig[1],
    tdA: s.td[0],
    tdB: s.td[1],
    tdAttA: s.tdAtt[0],
    tdAttB: s.tdAtt[1],
    controlA: s.ctrl[0],
    controlB: s.ctrl[1],
    subAttA: s.subAtt[0],
    subAttB: s.subAtt[1],
    standupSec: s.posSec[0],
    clinchSec: s.posSec[1],
    groundSec: s.posSec[2],
    anyTdA: s.td[0] > 0,
    anyTdB: s.td[1] > 0,
    r1DamageA: 0,
    r1DamageB: 0,
  };
  s.finished = true;
}

function standupTick(s: State, rng: Rng, ctx: FightContext, reachGap: number) {
  s.posSec[0] += TICK;
  if (chance(rng, wrestlingIntent(s, 0))) {
    takedownAttempt(s, rng, 0, ctx);
    return;
  }
  if (chance(rng, wrestlingIntent(s, 1))) {
    takedownAttempt(s, rng, 1, ctx);
    return;
  }
  if (chance(rng, 0.06 + (s.a.r.clinch + s.b.r.clinch) / 900)) {
    s.pos = "clinch";
    push(s, "clinch", chance(rng, 0.5) ? "A" : "B", "clinch");
    return;
  }
  strikeTick(s, rng, ctx, reachGap);
}

export function simulateOnce(
  fa: Fighter,
  fb: Fighter,
  ctx: FightContext,
  rng: Rng,
  recordEvents = false,
): { result: FightResult; events: TimelineEvent[] } {
  const a = liveFighter(fa, "A", ctx);
  const b = liveFighter(fb, "B", ctx);
  const mods = matchupMods(a, b, ctx);
  const s: State = {
    a,
    b,
    pos: "stand",
    top: null,
    stam: [1, 1],
    dmg: [0, 0],
    mobility: [1, 1],
    kd: [0, 0],
    sig: [0, 0],
    td: [0, 0],
    tdAtt: [0, 0],
    ctrl: [0, 0],
    subAtt: [0, 0],
    posSec: [0, 0, 0],
    rDmg: [0, 0],
    rSig: [0, 0],
    rCtrl: [0, 0],
    rKd: [0, 0],
    roundScores: [],
    finished: false,
    events: recordEvents ? [] : null,
    round: 1,
    sec: 0,
  };

  let r1A = 0;
  let r1B = 0;

  for (let round = 1; round <= ctx.rounds; round++) {
    s.round = round;
    s.rDmg = [0, 0];
    s.rSig = [0, 0];
    s.rCtrl = [0, 0];
    s.rKd = [0, 0];
    s.pos = "stand";
    s.top = null;
    s.stam[0] = clamp(s.stam[0] + 0.16 + a.r.cardio / 900, 0.2, 1);
    s.stam[1] = clamp(s.stam[1] + 0.16 + b.r.cardio / 900, 0.2, 1);
    if (round >= 4) {
      s.stam[0] *= 0.92;
      s.stam[1] *= 0.92;
    }

    for (let t = 0; t < TICKS; t++) {
      s.sec = (t + 1) * TICK;
      if (s.pos === "stand") standupTick(s, rng, ctx, mods.reachGap);
      else if (s.pos === "clinch") clinchTick(s, rng, ctx);
      else groundTick(s, rng, ctx);

      if (s.finished) {
        if (s.result) {
          s.result.r1DamageA = r1A;
          s.result.r1DamageB = r1B;
        }
        return { result: s.result!, events: s.events ?? [] };
      }
    }
    if (round === 1) {
      r1A = s.rDmg[0];
      r1B = s.rDmg[1];
    }
    s.roundScores.push(scoreRound(s));
  }
  decisionOf(s, rng);
  if (s.result) {
    s.result.r1DamageA = r1A;
    s.result.r1DamageB = r1B;
  }
  return { result: s.result!, events: s.events ?? [] };
}

export function emptySummary(n: number, seed: number): SimSummary {
  return {
    n,
    seed,
    pA: 0,
    pB: 0,
    pDraw: 0,
    methods: { koA: 0, subA: 0, decA: 0, koB: 0, subB: 0, decB: 0, draw: 0 },
    endRound: [0, 0, 0, 0, 0, 0],
    goesDistance: 0,
    avgSigA: 0,
    avgSigB: 0,
    avgTdA: 0,
    avgTdB: 0,
    avgControlA: 0,
    avgControlB: 0,
    pos: { standup: 0, clinch: 0, ground: 0 },
    knockdownsA: 0,
    knockdownsB: 0,
    splitRate: 0,
    pAGivenTdA: 0,
    pBGivenTdB: 0,
    pAIfStanding: 0,
    pBIfStanding: 0,
    earlyFinish: 0,
    ciA: [0, 1],
    ciB: [0, 1],
  };
}

export function simulateN(
  fa: Fighter,
  fb: Fighter,
  ctx: FightContext,
  n: number,
  seed: number,
): SimSummary {
  const rng = mulberry32(seed);
  let wA = 0,
    wB = 0,
    draw = 0;
  let koA = 0,
    subA = 0,
    decA = 0,
    koB = 0,
    subB = 0,
    decB = 0;
  const endRound = [0, 0, 0, 0, 0, 0];
  let dist = 0;
  let sigA = 0,
    sigB = 0,
    tdA = 0,
    tdB = 0,
    ctrlA = 0,
    ctrlB = 0;
  let stand = 0,
    clinch = 0,
    ground = 0;
  let kdA = 0,
    kdB = 0,
    splits = 0,
    early = 0;
  let tdACount = 0,
    tdAWins = 0,
    tdBCount = 0,
    tdBWins = 0;
  let standCount = 0,
    standA = 0,
    standB = 0;

  for (let i = 0; i < n; i++) {
    const { result: r } = simulateOnce(fa, fb, ctx, rng, false);
    if (r.winner === "A") wA += 1;
    else if (r.winner === "B") wB += 1;
    else draw += 1;
    if (r.method === "ko" && r.winner === "A") koA += 1;
    else if (r.method === "sub" && r.winner === "A") subA += 1;
    else if (r.method === "dec" && r.winner === "A") decA += 1;
    else if (r.method === "ko" && r.winner === "B") koB += 1;
    else if (r.method === "sub" && r.winner === "B") subB += 1;
    else if (r.method === "dec" && r.winner === "B") decB += 1;
    endRound[r.round] = (endRound[r.round] ?? 0) + 1;
    if (r.method === "dec" || r.method === "draw") dist += 1;
    sigA += r.sigA;
    sigB += r.sigB;
    tdA += r.tdA;
    tdB += r.tdB;
    ctrlA += r.controlA;
    ctrlB += r.controlB;
    stand += r.standupSec;
    clinch += r.clinchSec;
    ground += r.groundSec;
    kdA += r.knockdownsA;
    kdB += r.knockdownsB;
    if (r.decisionType === "sd") splits += 1;
    if (r.method !== "dec" && r.method !== "draw" && r.round === 1) early += 1;
    if (r.anyTdA) {
      tdACount += 1;
      if (r.winner === "A") tdAWins += 1;
    }
    if (r.anyTdB) {
      tdBCount += 1;
      if (r.winner === "B") tdBWins += 1;
    }
    const totalPos = r.standupSec + r.clinchSec + r.groundSec || 1;
    if (r.standupSec / totalPos > 0.78 && r.tdA + r.tdB === 0) {
      standCount += 1;
      if (r.winner === "A") standA += 1;
      if (r.winner === "B") standB += 1;
    }
  }

  const inv = 1 / n;
  return {
    n,
    seed,
    pA: wA * inv,
    pB: wB * inv,
    pDraw: draw * inv,
    methods: {
      koA: koA * inv,
      subA: subA * inv,
      decA: decA * inv,
      koB: koB * inv,
      subB: subB * inv,
      decB: decB * inv,
      draw: draw * inv,
    },
    endRound: endRound.map((x) => x * inv),
    goesDistance: dist * inv,
    avgSigA: sigA * inv,
    avgSigB: sigB * inv,
    avgTdA: tdA * inv,
    avgTdB: tdB * inv,
    avgControlA: ctrlA * inv,
    avgControlB: ctrlB * inv,
    pos: {
      standup: stand * inv,
      clinch: clinch * inv,
      ground: ground * inv,
    },
    knockdownsA: kdA * inv,
    knockdownsB: kdB * inv,
    splitRate: splits * inv,
    pAGivenTdA: tdACount ? tdAWins / tdACount : 0,
    pBGivenTdB: tdBCount ? tdBWins / tdBCount : 0,
    pAIfStanding: standCount ? standA / standCount : 0,
    pBIfStanding: standCount ? standB / standCount : 0,
    earlyFinish: early * inv,
    ciA: wilson(wA, n),
    ciB: wilson(wB, n),
  };
}

export async function simulateNAsync(
  fa: Fighter,
  fb: Fighter,
  ctx: FightContext,
  n: number,
  seed: number,
  onProgress?: (done: number) => void,
): Promise<SimSummary> {
  const batch = 400;
  const rng = mulberry32(seed);
  const acc = {
    wA: 0,
    wB: 0,
    draw: 0,
    koA: 0,
    subA: 0,
    decA: 0,
    koB: 0,
    subB: 0,
    decB: 0,
    endRound: [0, 0, 0, 0, 0, 0],
    dist: 0,
    sigA: 0,
    sigB: 0,
    tdA: 0,
    tdB: 0,
    ctrlA: 0,
    ctrlB: 0,
    stand: 0,
    clinch: 0,
    ground: 0,
    kdA: 0,
    kdB: 0,
    splits: 0,
    early: 0,
    tdACount: 0,
    tdAWins: 0,
    tdBCount: 0,
    tdBWins: 0,
    standCount: 0,
    standA: 0,
    standB: 0,
  };

  for (let i = 0; i < n; i++) {
    const { result: r } = simulateOnce(fa, fb, ctx, rng, false);
    if (r.winner === "A") acc.wA += 1;
    else if (r.winner === "B") acc.wB += 1;
    else acc.draw += 1;
    if (r.method === "ko" && r.winner === "A") acc.koA += 1;
    else if (r.method === "sub" && r.winner === "A") acc.subA += 1;
    else if (r.method === "dec" && r.winner === "A") acc.decA += 1;
    else if (r.method === "ko" && r.winner === "B") acc.koB += 1;
    else if (r.method === "sub" && r.winner === "B") acc.subB += 1;
    else if (r.method === "dec" && r.winner === "B") acc.decB += 1;
    acc.endRound[r.round] = (acc.endRound[r.round] ?? 0) + 1;
    if (r.method === "dec" || r.method === "draw") acc.dist += 1;
    acc.sigA += r.sigA;
    acc.sigB += r.sigB;
    acc.tdA += r.tdA;
    acc.tdB += r.tdB;
    acc.ctrlA += r.controlA;
    acc.ctrlB += r.controlB;
    acc.stand += r.standupSec;
    acc.clinch += r.clinchSec;
    acc.ground += r.groundSec;
    acc.kdA += r.knockdownsA;
    acc.kdB += r.knockdownsB;
    if (r.decisionType === "sd") acc.splits += 1;
    if (r.method !== "dec" && r.method !== "draw" && r.round === 1) acc.early += 1;
    if (r.anyTdA) {
      acc.tdACount += 1;
      if (r.winner === "A") acc.tdAWins += 1;
    }
    if (r.anyTdB) {
      acc.tdBCount += 1;
      if (r.winner === "B") acc.tdBWins += 1;
    }
    const totalPos = r.standupSec + r.clinchSec + r.groundSec || 1;
    if (r.standupSec / totalPos > 0.78 && r.tdA + r.tdB === 0) {
      acc.standCount += 1;
      if (r.winner === "A") acc.standA += 1;
      if (r.winner === "B") acc.standB += 1;
    }
    if (onProgress && (i + 1) % batch === 0) {
      onProgress(i + 1);
      await new Promise((res) => setTimeout(res, 0));
    }
  }

  const inv = 1 / n;
  return {
    n,
    seed,
    pA: acc.wA * inv,
    pB: acc.wB * inv,
    pDraw: acc.draw * inv,
    methods: {
      koA: acc.koA * inv,
      subA: acc.subA * inv,
      decA: acc.decA * inv,
      koB: acc.koB * inv,
      subB: acc.subB * inv,
      decB: acc.decB * inv,
      draw: acc.draw * inv,
    },
    endRound: acc.endRound.map((x) => x * inv),
    goesDistance: acc.dist * inv,
    avgSigA: acc.sigA * inv,
    avgSigB: acc.sigB * inv,
    avgTdA: acc.tdA * inv,
    avgTdB: acc.tdB * inv,
    avgControlA: acc.ctrlA * inv,
    avgControlB: acc.ctrlB * inv,
    pos: {
      standup: acc.stand * inv,
      clinch: acc.clinch * inv,
      ground: acc.ground * inv,
    },
    knockdownsA: acc.kdA * inv,
    knockdownsB: acc.kdB * inv,
    splitRate: acc.splits * inv,
    pAGivenTdA: acc.tdACount ? acc.tdAWins / acc.tdACount : 0,
    pBGivenTdB: acc.tdBCount ? acc.tdBWins / acc.tdBCount : 0,
    pAIfStanding: acc.standCount ? acc.standA / acc.standCount : 0,
    pBIfStanding: acc.standCount ? acc.standB / acc.standCount : 0,
    earlyFinish: acc.early * inv,
    ciA: wilson(acc.wA, n),
    ciB: wilson(acc.wB, n),
  };
}

export function fightContextFor(
  rounds: 3 | 5,
  altitudeFt: number,
  title: boolean,
  fa: Fighter,
  fb: Fighter,
): FightContext {
  return {
    rounds,
    altitudeFt,
    title,
    debutA: fa.flags?.ufcDebut,
    debutB: fb.flags?.ufcDebut,
    shortNoticeA: fa.flags?.shortNotice,
    shortNoticeB: fb.flags?.shortNotice,
  };
}
