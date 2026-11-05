"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";
import { api, ApiError } from "@/lib/estates/client";
import type { SavedResponse } from "@/lib/estates/types";

type Toggle = { id: string; saved: boolean };

/**
 * Saved estates with optimistic writes.
 *
 * `useOptimistic` shows the new state the instant you press save; when the request
 * settles the transition ends and React swaps in the confirmed server state, or snaps
 * back to the old one if it failed. `onSettled` lets the caller toast either outcome.
 */
export function useSaved(onSettled: (t: Toggle, error: string | null) => void) {
  const [saved, setSaved] = useState<string[]>([]);
  const [optimistic, applyOptimistic] = useOptimistic(saved, (cur: string[], t: Toggle) =>
    t.saved ? [...new Set([...cur, t.id])] : cur.filter((x) => x !== t.id),
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    const ctrl = new AbortController();
    api<SavedResponse>("/api/estates/saved", { label: "saved", signal: ctrl.signal })
      .then((r) => setSaved(r.saved))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const t: Toggle = { id, saved: !optimistic.includes(id) };
      startTransition(async () => {
        applyOptimistic(t);
        try {
          const r = await api<SavedResponse>("/api/estates/saved", {
            label: t.saved ? `save ${id}` : `unsave ${id}`,
            method: "POST",
            body: t,
          });
          startTransition(() => setSaved(r.saved));
          onSettled(t, null);
        } catch (err) {
          onSettled(t, err instanceof ApiError ? err.message : "Network error");
        }
      });
    },
    [optimistic, applyOptimistic, onSettled],
  );

  return { saved: optimistic, toggle };
}
