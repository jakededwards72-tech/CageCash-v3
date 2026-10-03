import type { Bout, EventCard } from "./types";

function bout(
  eventId: string,
  id: string,
  weight: Bout["division"],
  weightLabel: string,
  rounds: 3 | 5,
  title: boolean,
  billing: Bout["billing"],
  fighterA: string,
  fighterB: string,
  mlA: number,
  mlB: number,
): Bout {
  return {
    id: `${eventId}-${id}`,
    eventId,
    weight: weightLabel,
    division: weight,
    rounds,
    title,
    billing,
    fighterA,
    fighterB,
    market: { mlA, mlB },
  };
}

export const EVENTS: EventCard[] = [
  {
    id: "ufc-332",
    name: "UFC 332",
    subtitle: "Silva vs Wang",
    date: "2026-10-03",
    venue: "Delta Center",
    city: "Salt Lake City, UT",
    altitudeFt: 4226,
    timezoneNote: "Early prelims 4:00pm ET · Prelims 6:00pm ET · Main 8:00pm ET on CBS / Paramount+",
    bouts: [
      bout("ufc-332", "silva-wang", "womens-flyweight", "Women's Flyweight", 5, true, "main-event", "natalia-silva", "wang-cong", -205, +170),
      bout("ufc-332", "figgy-talbott", "bantamweight", "Bantamweight", 3, false, "co-main", "deiveson-figueiredo", "payton-talbott", +525, -750),
      bout("ufc-332", "green-ribovics", "lightweight", "Lightweight", 3, false, "main", "king-green", "esteban-ribovics", +180, -218),
      bout("ufc-332", "soldic-khaos", "welterweight", "Welterweight", 3, false, "main", "roberto-soldic", "khaos-williams", -218, +180),
      bout("ufc-332", "gautier-kopylov", "middleweight", "Middleweight", 3, false, "main", "ateba-gautier", "roman-kopylov", -238, +195),
      bout("ufc-332", "rodriguez-coria", "flyweight", "Flyweight", 3, false, "prelim", "imanol-rodriguez", "alden-coria", -146, +124),
      bout("ufc-332", "pinas-pulyaev", "middleweight", "Middleweight", 3, false, "prelim", "damian-pinas", "andrey-pulyaev", -590, +430),
      bout("ufc-332", "mcghee-romero", "featherweight", "Featherweight", 3, false, "prelim", "marcus-mcghee", "anthony-romero", -550, +410),
      bout("ufc-332", "wint-armand", "heavyweight", "Heavyweight", 3, false, "prelim", "anthony-wint", "lucas-armand", -500, +380),
      bout("ufc-332", "walker-parkin", "heavyweight", "Heavyweight", 3, false, "early", "johnny-walker", "mick-parkin", -112, -108),
      bout("ufc-332", "rda-hernandez", "lightweight", "Lightweight", 3, false, "early", "rafael-dos-anjos", "alexander-hernandez", +225, -278),
      bout("ufc-332", "vettori-naurdiev", "middleweight", "Middleweight", 3, false, "early", "marvin-vettori", "ismail-naurdiev", +120, -142),
      bout("ufc-332", "smith-whitehead", "welterweight", "Welterweight", 3, false, "early", "jacobe-smith", "bruce-whitehead", -1200, +750),
      bout("ufc-332", "nolan-mcgee", "welterweight", "Welterweight", 3, false, "early", "eric-nolan", "court-mcgee", -225, +185),
    ],
  },
  {
    id: "ufc-fn-allen-duncan",
    name: "UFC Fight Night",
    subtitle: "Allen vs Duncan",
    date: "2026-10-10",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    altitudeFt: 2003,
    timezoneNote: "Prelims 5:00pm ET · Main 8:00pm ET on Paramount+",
    bouts: [
      bout("ufc-fn-allen-duncan", "allen-duncan", "middleweight", "Middleweight", 5, false, "main-event", "brendan-allen", "christian-leroy-duncan", -162, +136),
      bout("ufc-fn-allen-duncan", "camilo-herbert", "lightweight", "Lightweight", 3, false, "main", "matheus-camilo", "jai-herbert", -180, +150),
      bout("ufc-fn-allen-duncan", "godinez-souza", "womens-strawweight", "Women's Strawweight", 3, false, "main", "loopy-godinez", "ketlen-souza", -205, +170),
      bout("ufc-fn-allen-duncan", "fili-kamaka", "featherweight", "Featherweight", 3, false, "main", "andre-fili", "kai-kamaka", -130, +110),
      bout("ufc-fn-allen-duncan", "walker-gm3", "light-heavyweight", "Light Heavyweight", 3, false, "main", "julius-walker", "gerald-meerschaert", -240, +198),
      bout("ufc-fn-allen-duncan", "wellmaker-tanzilovi", "bantamweight", "Bantamweight", 3, false, "main", "malcolm-wellmaker", "otari-tanzilovi", -205, +170),
      bout("ufc-fn-allen-duncan", "bonfim-prado", "lightweight", "Lightweight", 3, false, "prelim", "ismael-bonfim", "francisco-prado", -130, +110),
    ],
  },
  {
    id: "ufc-fn-buckley-malott",
    name: "UFC Fight Night",
    subtitle: "Buckley vs Malott",
    date: "2026-10-17",
    venue: "Rogers Place",
    city: "Edmonton, AB",
    altitudeFt: 2188,
    timezoneNote: "Prelims 5:00pm ET · Main 8:00pm ET on Paramount+",
    bouts: [
      bout("ufc-fn-buckley-malott", "buckley-malott", "welterweight", "Welterweight", 5, false, "main-event", "joaquin-buckley", "mike-malott", -145, +125),
    ],
  },
  {
    id: "ufc-333",
    name: "UFC 333",
    subtitle: "Volkanovski vs Evloev",
    date: "2026-10-24",
    venue: "Etihad Arena",
    city: "Abu Dhabi, UAE",
    altitudeFt: 16,
    timezoneNote: "Prelims 12:00pm ET · Main 2:00pm ET on Paramount+",
    bouts: [
      bout("ufc-333", "volk-evloev", "featherweight", "Featherweight", 5, true, "main-event", "alexander-volkanovski", "movsar-evloev", -102, -118),
      bout("ufc-333", "yan-merab", "bantamweight", "Bantamweight", 5, true, "co-main", "petr-yan", "merab-dvalishvili", -175, +145),
      bout("ufc-333", "kavanagh-temirov", "flyweight", "Flyweight", 3, false, "main", "loneer-kavanagh", "ramazan-temirov", -125, +105),
      bout("ufc-333", "volkov-kuniev", "heavyweight", "Heavyweight", 3, false, "main", "alexander-volkov", "rizvan-kuniev", -190, +160),
      bout("ufc-333", "allen-pico", "featherweight", "Featherweight", 3, false, "main", "arnold-allen", "aaron-pico", -148, +126),
      bout("ufc-333", "murzakanov-reyes", "light-heavyweight", "Light Heavyweight", 3, false, "prelim", "azamat-murzakanov", "dominick-reyes", -175, +148),
      bout("ufc-333", "krylov-yakhyaev", "light-heavyweight", "Light Heavyweight", 3, false, "prelim", "nikita-krylov", "abdul-rakhman-yakhyaev", +115, -135),
      bout("ufc-333", "abus-rowston", "middleweight", "Middleweight", 3, false, "prelim", "abus-magomedov", "cam-rowston", -210, +175),
      bout("ufc-333", "dawson-aliev", "lightweight", "Lightweight", 3, false, "prelim", "grant-dawson", "nurullo-aliev", -155, +135),
    ],
  },
  {
    id: "ufc-fn-moicano-nolan",
    name: "UFC Fight Night",
    subtitle: "Moicano vs Nolan",
    date: "2026-10-31",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    altitudeFt: 2003,
    timezoneNote: "Prelims 5:00pm ET · Main 8:00pm ET on Paramount+",
    bouts: [
      bout("ufc-fn-moicano-nolan", "moicano-nolan", "lightweight", "Lightweight", 5, false, "main-event", "renato-moicano", "tom-nolan", -150, +130),
    ],
  },
  {
    id: "ufc-fn-bonfim-brady",
    name: "UFC Fight Night",
    subtitle: "Bonfim vs Brady",
    date: "2026-11-07",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    altitudeFt: 2003,
    timezoneNote: "Prelims 5:00pm ET · Main 8:00pm ET on Paramount+",
    bouts: [
      bout("ufc-fn-bonfim-brady", "bonfim-brady", "welterweight", "Welterweight", 5, false, "main-event", "gabriel-bonfim", "sean-brady", -125, +105),
    ],
  },
  {
    id: "ufc-334",
    name: "UFC 334",
    subtitle: "Gane vs Hokit",
    date: "2026-11-14",
    venue: "Madison Square Garden",
    city: "New York, NY",
    altitudeFt: 33,
    timezoneNote: "Prelims 7:00pm ET · Main 9:00pm ET on Paramount+",
    bouts: [
      bout("ufc-334", "gane-hokit", "heavyweight", "Heavyweight", 5, true, "main-event", "ciryl-gane", "josh-hokit", -160, +140),
    ],
  },
];

export const EVENT_BY_ID: Record<string, EventCard> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
);

export const BOUT_BY_ID: Record<string, Bout> = Object.fromEntries(
  EVENTS.flatMap((e) => e.bouts.map((b) => [b.id, b])),
);

export function allBouts(): Bout[] {
  return EVENTS.flatMap((e) => e.bouts);
}

export const FEATURED_EVENT_ID = "ufc-332";
