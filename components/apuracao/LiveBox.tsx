"use client";

import { useEffect, useState } from "react";

type Live = { live: boolean; videoId: string | null };
const HANDLE = "BNTVBrasil";

/** Quadradinho da live do canal parceiro: só aparece quando está ao vivo, começa mudo. Clique no vídeo p/ som. */
export default function LiveBox() {
  const [s, setS] = useState<Live>({ live: false, videoId: null });
  const [fechado, setFechado] = useState(false);
  const [pronto, setPronto] = useState(false); // o vídeo (pesado) só carrega depois do resto da página

  useEffect(() => {
    const t = setTimeout(() => setPronto(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/live");
        if (r.ok) {
          const j = (await r.json()) as Live;
          if (alive) setS(j);
        }
      } catch {
        /* sem live */
      }
      if (alive) t = setTimeout(load, 90_000);
    };
    void load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  if (!s.live || !s.videoId || fechado || !/^[\w-]{11}$/.test(s.videoId)) return null;
  const src = `https://www.youtube-nocookie.com/embed/${s.videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 uppercase tracking-widest text-mute">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-red-500" />
          Ao vivo · @{HANDLE}
        </span>
        <button onClick={() => setFechado(true)} aria-label="Fechar live" className="px-1 text-mute">
          ✕
        </button>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {pronto ? <iframe
          src={src}
          title={`Live do canal ${HANDLE}`}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        /> : <div className="h-full w-full animate-pulse bg-line" />}
      </div>
      <a
        href={`https://www.youtube.com/@${HANDLE}/live`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-center text-[11px] text-mute underline"
      >
        Abrir no YouTube
      </a>
    </div>
  );
}
