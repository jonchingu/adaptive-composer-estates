"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { tween } from "@/lib/motion";

const EXAMPLES = [
  "描述你想租嘅單位…",
  "Describe the flat you want…",
  "步行5分鐘到港鐵嘅兩房",
  "九龍灣月租$18,000以下",
  "同區實用呎租邊個最平？",
  "供款試算 · 呎租比較",
];

export function CyclingPlaceholder() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 end-0 flex items-center overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          className="absolute truncate text-[16px] leading-8 font-[450] tracking-[-0.01em] text-muted-foreground sm:text-[17px]"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={reduce ? tween.fade : tween.crossfade}
        >
          {EXAMPLES[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
