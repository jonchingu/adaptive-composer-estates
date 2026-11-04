"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import type { CardIntent } from "@/lib/jev/types";
import { spring, tween } from "@/lib/motion";

/** Midland-style empty-state suggestion pills (renter search). */
export const RENTER_SUGGESTIONS: { text: string; intent: CardIntent }[] = [
  { text: "步行5分鐘到港鐵嘅兩房", intent: "distance" },
  { text: "九龍灣月租$18,000以下", intent: "price" },
  { text: "同區實用呎租邊個最平？簡述原因", intent: "rank" },
];

export function SuggestionChips({
  show,
  onPick,
}: {
  show: boolean;
  onPick: (text: string, intent: CardIntent) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="suggestions"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, transition: tween.exit }}
          transition={reduce ? tween.fade : spring.settle}
          className="mt-4 flex flex-col items-stretch gap-2 px-1"
          role="list"
          aria-label="搜尋建議"
        >
          {RENTER_SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s.text}
              type="button"
              role="listitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(s.text, s.intent)}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? tween.fade : { ...spring.snappy, delay: 0.04 + i * 0.04 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              className="flex w-full items-center gap-2.5 rounded-full border border-transparent bg-[#f3f3f1] px-3.5 py-2.5 text-start text-[13.5px] leading-[18px] font-medium text-ink-2 shadow-none transition-[background-color,color] duration-150 hover:bg-[#ebebe8] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden strokeWidth={2} />
              <span className="min-w-0 flex-1">{s.text}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
