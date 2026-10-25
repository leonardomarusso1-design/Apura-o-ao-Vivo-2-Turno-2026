"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Live = { live: boolean; videoId: string | null; canal?: string | null; canalUrl?: string | null };

const YT = "https://www.youtube-nocookie.com";
const VOLUME = 50;

/**
 * Quadradinho da live do canal parceiro: só aparece quando está ao vivo.
 * O navegador só libera som depois de um toque/clique do visitante: o vídeo começa mudo e, no primeiro toque ou clique
 * em qualquer lugar da página, o som liga em 50%. O botão "Som" faz o mesmo manualmente.
 */
export default function LiveBox() {
  const [s, setS] = useState<Live>({ live: false, videoId: null });
  const [fechado, setFechado] = useState(false);
  const [pronto, setPronto] = useState(false); // o vídeo (pesado) só carrega depois do resto da página
  const ref = useRef<HTMLIFrameElement>(null);

  const enviar = useCallback((func: string, args: unknown[] = []) => {
    ref.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT);
  }, []);
  const ligarSom = useCallback(() => {
    enviar("setVolume", [VOLUME]);
    enviar("unMute");
    enviar("setVolume", [VOLUME]);
  }, [enviar]);

  // primeiro toque/clique/tecla do visitante: liga o som em 50%
  useEffect(() => {
    if (!pronto) return;
    const ev = ["pointerdown", "keydown", "touchstart"] as const;
    const uma = () => {
      ligarSom();
      for (const e of ev) window.removeEventListener(e, uma);
    };
    for (const e of ev) window.addEventListener(e, uma, { passive: true });
    return () => {
      for (const e of ev) window.removeEventListener(e, uma);
    };
  }, [pronto, ligarSom]);

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
  const canal = s.canal?.trim() || "";
  const src = `https://www.youtube-nocookie.com/embed/${s.videoId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 uppercase tracking-widest text-mute">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-red-500" />
          Ao vivo{canal ? ` · ${canal}` : ""}
        </span>
        <span className="flex items-center gap-1">
          <button onClick={ligarSom} aria-label="Ligar o som da live em 50%" className="rounded border border-line px-1.5 py-0.5 text-[10px] text-paper hover:bg-white/5">
            🔊 Som
          </button>
          <button onClick={() => setFechado(true)} aria-label="Fechar live" className="px-1 text-mute">
            ✕
          </button>
        </span>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {pronto ? <iframe
          ref={ref}
          onLoad={() => {
            ref.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), YT);
            enviar("setVolume", [VOLUME]);
          }}
          src={src}
          title={canal ? `Live do canal ${canal}` : "Transmissão ao vivo"}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        /> : <div className="h-full w-full animate-pulse bg-line" />}
      </div>
      <a
        href={`https://www.youtube.com/watch?v=${s.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-center text-[11px] text-mute underline"
      >
        Abrir no YouTube
      </a>
    </div>
  );
}
