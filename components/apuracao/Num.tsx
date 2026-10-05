"use client";

import { useEffect, useRef, useState } from "react";
import { fmtPct } from "./types";

/** Número que "rola" suavemente até o novo valor (0,6 s). Sem animação com "reduzir movimento". */
export default function Num({ v, d = 2 }: { v: number; d?: number }) {
  const [x, setX] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from.current === v) {
      from.current = v;
      setX(v);
      return;
    }
    const a = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      setX(a + (v - a) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = v;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <>{fmtPct(x, d)}</>;
}
