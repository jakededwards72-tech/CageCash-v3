import { useEffect, useMemo, useState } from "react";
import { runBoutSim } from "@/lib/mma/run";
import { useDesk } from "@/lib/mma/store";
import type { Bout, SimSummary } from "@/lib/mma/types";

export function simKey(boutId: string, n: number) {
  return `${boutId}:${n}`;
}

export function useCardSims(bouts: Bout[]) {
  const n = useDesk((s) => s.simCount);
  const cache = useDesk((s) => s.cache);
  const putSim = useDesk((s) => s.putSim);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const ids = bouts.map((b) => b.id).join("|");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRunning(true);
      setProgress(0);
      for (let i = 0; i < bouts.length; i++) {
        if (cancelled) return;
        const b = bouts[i]!;
        const key = simKey(b.id, n);
        if (!useDesk.getState().cache[key]) {
          const summary = await runBoutSim(b, n);
          if (cancelled) return;
          putSim(key, summary);
        }
        setProgress(i + 1);
      }
      if (!cancelled) setRunning(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, n]);

  const summaries = useMemo(() => {
    const map: Record<string, SimSummary> = {};
    for (const b of bouts) {
      const s = cache[simKey(b.id, n)];
      if (s) map[b.id] = s;
    }
    return map;
  }, [cache, bouts, n]);

  return { summaries, progress, running, n, total: bouts.length };
}

export function useBoutSim(bout: Bout | null) {
  const n = useDesk((s) => s.simCount);
  const cache = useDesk((s) => s.cache);
  const putSim = useDesk((s) => s.putSim);
  const [running, setRunning] = useState(false);
  const key = bout ? simKey(bout.id, n) : "";
  const summary = key ? cache[key] : undefined;

  useEffect(() => {
    if (!bout) return;
    if (useDesk.getState().cache[key]) return;
    let cancelled = false;
    setRunning(true);
    runBoutSim(bout, n).then((s) => {
      if (cancelled) return;
      putSim(key, s);
      setRunning(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bout, key, n, putSim]);

  return { summary, running, n };
}
