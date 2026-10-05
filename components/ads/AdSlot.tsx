"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import SponsorSlot from "../apuracao/SponsorSlot";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? ""; // ca-pub-XXXXXXXXXXXXXXXX
const LS = "apuracao:ads-consent";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[] & { requestNonPersonalizedAds?: number };
  }
}

/** Anúncio AdSense com altura fixa (sem layout shift). Sem NEXT_PUBLIC_ADSENSE_CLIENT/slot => mostra "Anuncie aqui". */
export default function AdSlot({ slot, height = 250, label }: { slot?: string; height?: number; label?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const [ok, setOk] = useState(false);
  const enabled = Boolean(CLIENT && slot && /^ca-pub-\d{10,20}$/.test(CLIENT) && /^\d{6,15}$/.test(slot));

  useEffect(() => {
    if (!enabled) return;
    try {
      const w = window;
      w.adsbygoogle = w.adsbygoogle || ([] as unknown as NonNullable<Window["adsbygoogle"]>);
      // Anúncios não personalizados, a menos que a pessoa tenha aceitado
      let consent = false;
      try {
        consent = localStorage.getItem(LS) === "1";
      } catch {
        /* ignore */
      }
      w.adsbygoogle.requestNonPersonalizedAds = consent ? 0 : 1;
      if (ref.current && !ref.current.dataset.adsbygoogleStatus) {
        w.adsbygoogle.push({});
      }
      setOk(true);
    } catch {
      /* bloqueado por adblock */
    }
  }, [enabled]);

  if (!enabled) return <SponsorSlot label={label} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel" style={{ minHeight: height }}>
      {ok ? null : null}
      <Script
        id="adsbygoogle-js"
        async
        strategy="lazyOnload"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
        crossOrigin="anonymous"
      />
      <ins
        ref={ref}
        className="adsbygoogle block"
        style={{ display: "block", minHeight: height }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <p className="py-0.5 text-center text-[9px] uppercase tracking-widest text-mute">Publicidade</p>
    </div>
  );
}
