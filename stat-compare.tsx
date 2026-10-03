import { cn } from "@/lib/utils";

const ROWS: { key: keyof import("@/lib/mma/types").Ratings; label: string }[] = [
  { key: "stkOut", label: "Output" },
  { key: "stkAcc", label: "Accuracy" },
  { key: "power", label: "Power" },
  { key: "stkDef", label: "Str. def" },
  { key: "kicks", label: "Kicks" },
  { key: "tdOff", label: "TD off" },
  { key: "tdDef", label: "TD def" },
  { key: "top", label: "Top control" },
  { key: "subOff", label: "Sub off" },
  { key: "cardio", label: "Cardio" },
  { key: "chin", label: "Chin" },
  { key: "iq", label: "Fight IQ" },
  { key: "pace", label: "Pace" },
  { key: "killer", label: "Finishing" },
];

export function StatCompare({
  a,
  b,
  aName,
  bName,
}: {
  a: import("@/lib/mma/types").Ratings;
  b: import("@/lib/mma/types").Ratings;
  aName: string;
  bName: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-4 flex justify-between text-xs uppercase tracking-[0.14em] text-muted">
        <span>{aName}</span>
        <span>Live ratings</span>
        <span>{bName}</span>
      </div>
      <div className="space-y-2.5">
        {ROWS.map((row) => {
          const av = a[row.key];
          const bv = b[row.key];
          return (
            <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex items-center justify-end gap-2">
                <span className="font-mono text-[11px] tabular-nums text-muted w-6 text-right">{av.toFixed(0)}</span>
                <div className="h-1.5 w-full max-w-36 rounded-full bg-elevated overflow-hidden flex justify-end">
                  <div
                    className={cn("h-full rounded-full", av >= bv ? "bg-red-corner" : "bg-red-corner/40")}
                    style={{ width: `${(av / 100) * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-24 text-center text-[11px] uppercase tracking-[0.08em] text-subtle">{row.label}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-full max-w-36 rounded-full bg-elevated overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", bv >= av ? "bg-blue-corner" : "bg-blue-corner/40")}
                    style={{ width: `${(bv / 100) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-muted w-6">{bv.toFixed(0)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
