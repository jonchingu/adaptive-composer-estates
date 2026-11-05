"use client";

import { use } from "react";
import { api } from "@/lib/estates/client";
import type { EstateDetail } from "@/lib/estates/types";

type Detail = EstateDetail & { serverMs: number };

/**
 * Detail is a static resource per estate, so it's fetched once and the promise is cached.
 * Components read it with React 19's `use()` inside <Suspense>; the list prefetches on
 * focus/hover, so by the time the sheet opens the promise has usually resolved.
 */
const promises = new Map<string, Promise<Detail>>();

export function detailPromise(id: string): Promise<Detail> {
  let p = promises.get(id);
  if (!p) {
    p = api<Detail>(`/api/estates/${id}`, { label: `detail ${id}` });
    // Failed fetches are evicted so the next read retries instead of re-throwing forever.
    p.catch(() => promises.delete(id));
    promises.set(id, p);
  }
  return p;
}

export const prefetchDetail = (id: string) => void detailPromise(id).catch(() => {});

/** Suspends until the detail for `id` is ready. Must render under <Suspense>. */
export function useEstateDetail(id: string): Detail {
  return use(detailPromise(id));
}
