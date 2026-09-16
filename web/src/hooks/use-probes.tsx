import { useCallback, useEffect, useRef } from "react";

import { postProbes, type Ping, type Point } from "@/lib/api";

const FLUSH_MS = 15_000;
// PingIn is capped at 120 per request server-side; 30 leaves headroom for a
// slow flush cycle without ever hitting that limit.
const MAX_BATCH = 30;

/**
 * Buffers position updates while a trip runs and flushes them in one batch
 * every FLUSH_MS, rather than a request per fix.
 *
 * This is what feeds /coverage. A trip that never calls record() contributes
 * nothing to it, on purpose: Phase 3 only has a number to look at once real
 * trips are sending pings, so wiring this in is the whole point of the phase.
 */
export function useProbes(active: boolean) {
  const buffer = useRef<Ping[]>([]);

  useEffect(() => {
    if (!active) return;
    const flush = () => {
      if (buffer.current.length === 0) return;
      const batch = buffer.current;
      buffer.current = [];
      postProbes(batch).catch(() => {
        // Lost pings are lost traffic data, not a broken trip. The traveller
        // is never told; the matcher already discards ambiguous data, so a
        // dropped batch is the same shape of loss as a bad GPS fix.
      });
    };
    const timer = window.setInterval(flush, FLUSH_MS);
    return () => {
      window.clearInterval(timer);
      flush();
    };
  }, [active]);

  const record = useCallback((point: Point) => {
    buffer.current.push({ ...point, at: Date.now() / 1000 });
    if (buffer.current.length >= MAX_BATCH) {
      const batch = buffer.current;
      buffer.current = [];
      postProbes(batch).catch(() => {});
    }
  }, []);

  return { record };
}
