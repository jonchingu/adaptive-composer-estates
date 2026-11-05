"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { mockControls, type RequestEntry, requestLog } from "@/lib/estates/client";
import type { LatencyProfile } from "@/lib/estates/types";
import { cn } from "@/lib/utils";

/**
 * Dev overlay: live request log plus knobs for the mock backend's latency and write
 * failure rate. Toggle with the button or `?hud=0` to hide. Purely observational: it
 * reads the client fetch layer's stores and never touches composer state.
 */

const STATUS: Record<RequestEntry["status"], string> = {
  pending: "text-[rgb(160,162,240)]",
  ok: "text-white/70",
  aborted: "text-white/35 line-through",
  error: "text-[rgb(255,120,130)]",
};

const EMPTY: RequestEntry[] = [];

export function NetworkHud() {
  const log = useSyncExternalStore(requestLog.subscribe, requestLog.get, () => EMPTY);
  const controls = useSyncExternalStore(mockControls.subscribe, mockControls.get, mockControls.get);
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed top-3 right-3 z-30 w-[236px] rounded-2xl bg-black/55 p-2.5 font-mono text-[11px] leading-4 text-white/80 backdrop-blur-md max-md:hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center justify-between text-white/90">
        <span>mock api</span>
        <span className="text-white/50">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <div className="mt-2 flex items-center gap-1">
            <span className="me-1 text-white/50">latency</span>
            {(["off", "normal", "slow"] as LatencyProfile[]).map((l) => (
              <button
                key={l}
                onClick={() => mockControls.set({ ...controls, latency: l })}
                className={cn("cursor-pointer rounded-md px-1.5 py-0.5", controls.latency === l ? "bg-white text-black" : "bg-white/10")}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={controls.failRate > 0}
              onChange={(e) => mockControls.set({ ...controls, failRate: e.target.checked ? 0.5 : 0 })}
              className="accent-[rgb(108,110,214)]"
            />
            <span>fail 50% of saves</span>
          </label>
          <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
            <AnimatePresence initial={false}>
              {log.map((e) => (
                <motion.li
                  key={e.id}
                  layout="position"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn("flex justify-between gap-2", STATUS[e.status])}
                >
                  <span className="truncate">
                    {e.status === "pending" ? "● " : ""}
                    {e.label}
                  </span>
                  <span className="tabular-nums">{e.status === "pending" ? "…" : e.status === "ok" ? `${e.ms}ms` : e.status}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {log.length === 0 && <li className="text-white/40">no requests yet</li>}
          </ul>
        </>
      )}
    </div>
  );
}
