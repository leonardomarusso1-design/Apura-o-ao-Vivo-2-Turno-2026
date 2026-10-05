"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BR_UFS } from "@/lib/br-map";

/** Silhueta do estado (ou globo, para o exterior) colorida com a cor de quem lidera. */
export default function UfIcone({ uf, cor, size = 36 }: { uf: string; cor: string; size?: number }) {
  const ref = useRef<SVGPathElement>(null);
  const [vb, setVb] = useState<string | null>(null);
  const shape = BR_UFS.find((u) => u.id.toUpperCase() === uf);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBBox();
    const pad = Math.max(b.width, b.height) * 0.08;
    setVb(`${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
  }, [uf]);

  const caixa = "inline-flex shrink-0 items-center justify-center rounded-lg border border-line bg-ink";

  if (uf === "ZZ" || !shape) {
    return (
      <span className={caixa} style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke={cor} strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" />
        </svg>
      </span>
    );
  }

  return (
    <span className={caixa} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox={vb ?? "0 0 613 639"} width={size * 0.78} height={size * 0.78} preserveAspectRatio="xMidYMid meet">
        <path ref={ref} d={shape.path} fill={cor} />
      </svg>
    </span>
  );
}
