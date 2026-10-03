import type { Bout, EventCard, Fighter, LineRow, SimSummary } from "./types";
import { fairAmerican, formatAmerican, formatPct, impliedProb, noVigPair } from "./betting";
import { liveFighter, matchupMods } from "./prepare";
import { fightContextFor } from "./simulate";

export interface Tape {
  headline: string;
  lean: string;
  paragraphs: string[];
  pathsA: string[];
  pathsB: string[];
  keys: string[];
  fade: string[];
}

function last(f: Fighter) {
  return f.last;
}

function stanceNote(a: Fighter, b: Fighter): string | null {
  if (a.stance === b.stance && a.stance === "southpaw") {
    return `Closed-stance southpaw meeting. The lead calf and the rear-hand lane both get crowded — this becomes a kicking match unless someone forces a grappling tax.`;
  }
  if (
    (a.stance === "southpaw" && b.stance === "orthodox") ||
    (b.stance === "southpaw" && a.stance === "orthodox")
  ) {
    return `Open stance. Lead-hand and outside-calf lanes are live. Head kicks exist on the open side. The first fighter who wins the lead-foot battle dictates range.`;
  }
  return null;
}

export function writeTape(
  event: EventCard,
  bout: Bout,
  a: Fighter,
  b: Fighter,
  sim: SimSummary,
  board: LineRow[],
): Tape {
  const ctx = fightContextFor(bout.rounds, event.altitudeFt, bout.title, a, b);
  const la = liveFighter(a, "A", ctx);
  const lb = liveFighter(b, "B", ctx);
  const mods = matchupMods(la, lb, ctx);
  const [mktA] = noVigPair(bout.market.mlA, bout.market.mlB);
  const edgeA = sim.pA - mktA;
  const favorite = sim.pA >= sim.pB ? a : b;
  const dog = favorite === a ? b : a;
  const favP = favorite === a ? sim.pA : sim.pB;
  const dogP = 1 - favP - sim.pDraw;
  const finishA = sim.methods.koA + sim.methods.subA;
  const finishB = sim.methods.koB + sim.methods.subB;
  const best = board.filter((r) => r.tag === "best" || r.tag === "value").sort((x, y) => y.ev - x.ev);
  const traps = board.filter((r) => r.tag === "trap").sort((x, y) => x.ev - y.ev);

  const lean =
    Math.abs(sim.pA - 0.5) < 0.03
      ? `Pick'em. Model ${formatPct(sim.pA)} / ${formatPct(sim.pB)} with a ${formatPct(sim.pDraw)} draw tail.`
      : `Model lean: ${favorite.last} ${formatPct(favP)} (CI ${formatPct((favorite === a ? sim.ciA : sim.ciB)[0])}–${formatPct((favorite === a ? sim.ciA : sim.ciB)[1])}).`;

  const headline =
    Math.abs(edgeA) < 0.02
      ? `${a.last} vs ${b.last} is priced honestly. The work is in the props.`
      : edgeA > 0
        ? `Market is short ${a.last}. Model has ${formatPct(sim.pA)} vs no-vig ${formatPct(mktA)}.`
        : `Market is long ${a.last}. ${b.last} is the side the number is hiding.`;

  const paragraphs: string[] = [];

  paragraphs.push(
    `${event.city}${event.altitudeFt >= 3500 ? ` at ${event.altitudeFt.toLocaleString()} ft` : ""}, ${bout.rounds} rounds${bout.title ? ", title fight" : ""}. ${a.first} ${a.last} (${a.record.w}-${a.record.l}${a.record.d ? `-${a.record.d}` : ""}, ${a.age}) against ${b.first} ${b.last} (${b.record.w}-${b.record.l}${b.record.d ? `-${b.record.d}` : ""}, ${b.age}). The book has ${a.last} ${formatAmerican(bout.market.mlA)} / ${b.last} ${formatAmerican(bout.market.mlB)} — implied ${formatPct(impliedProb(bout.market.mlA))} / ${formatPct(impliedProb(bout.market.mlB))} before vig strip. After ${sim.n.toLocaleString()} Monte Carlo runs the cage model sits at ${formatPct(sim.pA)} / ${formatPct(sim.pB)}.`,
  );

  const reach = a.reachIn - b.reachIn;
  paragraphs.push(
    `Physical: ${a.last} ${a.heightIn}" / ${a.reachIn}" reach, ${a.stance}; ${b.last} ${b.heightIn}" / ${b.reachIn}" reach, ${b.stance}.${Math.abs(reach) >= 3 ? ` That ${Math.abs(reach).toFixed(0)}" reach gap is not trivia — it changes who is allowed to throw the 1-2 without eating the counter.` : " Range is a wash; this will be decided by entry and the first wrestle."}`,
  );

  const st = stanceNote(a, b);
  if (st) paragraphs.push(st);

  const standShare = sim.pos.standup / (sim.pos.standup + sim.pos.clinch + sim.pos.ground || 1);
  const groundShare = sim.pos.ground / (sim.pos.standup + sim.pos.clinch + sim.pos.ground || 1);
  paragraphs.push(
    `Where it lives: ${formatPct(standShare)} of fight time standing, ${formatPct(groundShare)} on the mat. Projected significant strikes ${sim.avgSigA.toFixed(0)}–${sim.avgSigB.toFixed(0)}. Takedowns ${sim.avgTdA.toFixed(1)}–${sim.avgTdB.toFixed(1)}. If ${a.last} completes a takedown the model jumps to ${formatPct(sim.pAGivenTdA)} for them. If ${b.last} does, ${formatPct(sim.pBGivenTdB)}. In pure standup samples: ${a.last} ${formatPct(sim.pAIfStanding)} / ${b.last} ${formatPct(sim.pBIfStanding)}. That split is the whole sport. Bet the fighter whose path you actually think lands, not the one whose highlight you remember.`,
  );

  paragraphs.push(
    `How it ends: ${a.last} KO/TKO ${formatPct(sim.methods.koA)}, submission ${formatPct(sim.methods.subA)}, decision ${formatPct(sim.methods.decA)}. ${b.last} KO/TKO ${formatPct(sim.methods.koB)}, submission ${formatPct(sim.methods.subB)}, decision ${formatPct(sim.methods.decB)}. Distance rate ${formatPct(sim.goesDistance)}. Round-1 finish ${formatPct(sim.earlyFinish)}. Split-decision noise ${formatPct(sim.splitRate)} — if you're on a narrow favorite, that is the hidden juice the moneyline does not advertise.`,
  );

  if (event.altitudeFt >= 3500) {
    paragraphs.push(
      `Altitude is not flavor text. ${event.altitudeFt.toLocaleString()} ft in Salt Lake is a different cardiovascular sport after nine minutes. Volume kickboxers without a wrestling off-switch get their output taxed harder than grinders who can lie on a body. Five-round fights here have historically paid the wrestler and the finisher, not the 6-SLpM tourist. If your pick needs a pretty round 4, fade it.`,
    );
  }

  if (a.flags?.ufcDebut || b.flags?.ufcDebut) {
    const d = a.flags?.ufcDebut ? a : b;
    paragraphs.push(
      `${d.last} is walking into the UFC cage for the first time. Regional destruction does not automatically translate — the octagon is 10 feet wider than a typical regional cage, the fence is chain, and the first time a long athletic American runs at you is a real skill test. Debut KO/TKO tails are fatter in both directions. Price that, don't ignore it.`,
    );
  }

  if (a.age >= 37 || b.age >= 37) {
    const old = a.age >= b.age ? a : b;
    paragraphs.push(
      `${old.last} is ${old.age}. Chin, recovery, and first-step explosiveness do not negotiate with calendars. Name value is how you get juiced into a bad favorite. The model already decayed the athletic ratings; if you're still taking them -200 because they "know how to win," you are betting a press conference.`,
    );
  }

  if (mods.powerChinA > 1.25 || mods.powerChinB > 1.25) {
    const puncher = mods.powerChinA > mods.powerChinB ? a : b;
    const chin = puncher === a ? b : a;
    paragraphs.push(
      `Power-to-chin mismatch: ${puncher.last}'s power versus ${chin.last}'s durability is the live wire. One clean entry and the simulation jumps. That is why a fighter can be 20% to win and still be a terrible underdog to fade at huge plus money — the tail is real, the body of the distribution is not.`,
    );
  }

  if (a.notes) paragraphs.push(`On ${a.last}: ${a.notes}`);
  if (b.notes) paragraphs.push(`On ${b.last}: ${b.notes}`);

  if (best[0]) {
    paragraphs.push(
      `Number to beat: ${best[0].label} at ${formatAmerican(best[0].american)}. Model ${formatPct(best[0].model)} versus implied ${formatPct(best[0].implied)}, EV ${ (best[0].ev * 100).toFixed(1)}%. Fair price ${formatAmerican(fairAmerican(best[0].model))}. That is the seat. Everything else is entertainment.`,
    );
  } else {
    paragraphs.push(
      `No clean plus-EV seat at these numbers. Passing is a position. The worst thing you can do in MMA is manufacture a bet because the card is on.`,
    );
  }

  if (traps[0]) {
    paragraphs.push(
      `Trap: ${traps[0].label} at ${formatAmerican(traps[0].american)} is a ${formatPct(traps[0].implied)} implied price on a ${formatPct(traps[0].model)} event. You are paying a celebrity tax. If this is the bet your group chat is texting, you already know how this ends.`,
    );
  }

  const pathsA = [
    standShare > 0.65 && a.ratings.stkOut >= b.ratings.stkOut
      ? `Keep it standing, win the volume and the lead calf, make ${b.last} reset every 20 seconds.`
      : `Do not stand and trade for pride. The math on the feet is not the seat.`,
    a.ratings.tdOff > b.ratings.tdDef - 4
      ? `Chain wrestle. The first shot can fail; the second cannot. Control time is a judge's language ${a.last} should be fluent in.`
      : `Wrestling is a bluff here. Shoot only as a mix, not as a home.`,
    finishA > 0.28
      ? `Look for the finish — model has ${formatPct(finishA)} of ${a.last} wins ending before the scorecards.`
      : `Do not hunt a highlight. Decision is the product.`,
  ];

  const pathsB = [
    sim.pBIfStanding > sim.pB
      ? `Standing is ${b.last}'s best country. Range, kicks, punish the level change.`
      : `Standing is a tax. Get to the body, get to the fence, make it ugly.`,
    b.ratings.tdOff > a.ratings.tdDef - 4
      ? `Wrestle the moment the striking gets honest. ${a.last}'s chin/output combo is not a round-you-want-to-live-in.`
      : `Stuff the shot and exit. TDD is the fight.`,
    finishB > 0.28
      ? `The finish tail is live: ${formatPct(finishB)} of ${b.last} wins don't see the judges.`
      : `Grind. The judges will pay control if the damage is even.`,
  ];

  const keys = [
    ...mods.notes,
    `${a.last} cardio live ${la.r.cardio.toFixed(0)} vs ${b.last} ${lb.r.cardio.toFixed(0)} after age/altitude.`,
    `Power/chin: ${a.last} ${mods.powerChinA.toFixed(2)}x on ${b.last}'s chin; reverse ${mods.powerChinB.toFixed(2)}x.`,
    bout.rounds === 5
      ? `Five rounds changes everything for the fighter who has never been there. Late-round output is a skill, not a hope.`
      : `Three rounds rewards the fast starter. Don't overpay going-the-distance if the model says the firefight is front-loaded.`,
  ];

  const fade: string[] = [];
  for (const t of traps.slice(0, 3)) fade.push(`${t.label} ${formatAmerican(t.american)} — model ${formatPct(t.model)}, implied ${formatPct(t.implied)}.`);
  const juicedFav = board.find((r) => r.market === (sim.pA > sim.pB ? "mlA" : "mlB") && r.ev < -0.04);
  if (juicedFav) {
    fade.push(
      `${juicedFav.label} is a correct-side, wrong-price problem. Being likely to win is not the same as being +EV at ${formatAmerican(juicedFav.american)}.`,
    );
  }
  if (dogP < 0.18 && (dog.record.w > 20 || dog.ranking === "C" || typeof dog.ranking === "number")) {
    fade.push(
      `${dog.last} at plus money is a name, not a seat. Live-dog culture is how you donate a bankroll to a 14% tail.`,
    );
  }

  return { headline, lean, paragraphs, pathsA, pathsB, keys, fade };
}
