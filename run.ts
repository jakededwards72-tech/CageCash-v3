import { BOUT_BY_ID, EVENT_BY_ID } from "./cards";
import { fighterById } from "./fighters";
import { fightContextFor, simulateNAsync } from "./simulate";
import type { SimSummary } from "./types";
import { hashSeed } from "./rng";
import type { Bout, EventCard, Fighter } from "./types";

export function resolveBout(bout: Bout): {
  bout: Bout;
  event: EventCard;
  a: Fighter;
  b: Fighter;
} {
  const event = EVENT_BY_ID[bout.eventId];
  if (!event) throw new Error(`Missing event ${bout.eventId}`);
  return {
    bout,
    event,
    a: fighterById(bout.fighterA),
    b: fighterById(bout.fighterB),
  };
}

export function boutById(id: string) {
  const bout = BOUT_BY_ID[id];
  if (!bout) return null;
  return resolveBout(bout);
}

export async function runBoutSim(bout: Bout, n: number): Promise<SimSummary> {
  const { event, a, b } = resolveBout(bout);
  const ctx = fightContextFor(bout.rounds, event.altitudeFt, bout.title, a, b);
  const seed = hashSeed(`${bout.id}:${n}:v3`);
  return simulateNAsync(a, b, ctx, n, seed);
}
