import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EstatesComposer } from "@/components/estates/EstatesComposer";
import { EstatesSkeleton } from "@/components/estates/EstatesSkeleton";
import { api, isAbort } from "@/lib/estates/client";
import { DEFAULT_PARAMS, type SearchResponse, toQueryString } from "@/lib/estates/types";

/**
 * Shows the skeleton, fetches the first ranking from the Worker, then hands over to the composer.
 *
 *   ?autoplay=0   start paused   ·   ?hold=4   seconds to hold each autoplay step
 */
export function EstatesPage() {
  const q = new URLSearchParams(window.location.search);
  const autoplay = q.get("autoplay") !== "0";
  const hold = Math.min(6, Math.max(1, Number(q.get("hold")) || 2.6));

  const [initial, setInitial] = useState<SearchResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    document.title = "One Say 壹居 — Smart Composer";
    const ctrl = new AbortController();
    api<SearchResponse>(`/api/estates?${toQueryString(DEFAULT_PARAMS)}`, { label: "search", signal: ctrl.signal })
      .then(setInitial)
      .catch((err) => {
        if (!isAbort(err)) setFailed(true);
      });
    return () => ctrl.abort();
  }, [attempt]);

  if (failed)
    return (
      <main className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 px-4 pt-[22vh]">
        <h1 className="text-[17px] leading-6 font-[550]">Unable to load estates</h1>
        <p className="text-ink-2 text-[15px] leading-[22px]">The API didn’t answer. Check that the Worker is running.</p>
        <Button
          size="sm"
          className="px-4"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </main>
    );
  if (!initial) return <EstatesSkeleton />;
  return <EstatesComposer initial={initial} autoplay={autoplay} holdMs={hold * 1000} />;
}
