"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MAX_FAIXAS, MAX_IMGS, SEG_PADRAO, limparLink, limparSeg, type Patro } from "@/lib/patro";

export type { Patro };

/** Enquanto não houver patrocinador, a faixa e o banner divulgam o TOQY. */
export const FAIXA_PADRAO = ["TOQY: crie seu link na bio e seu cartão digital profissional em minutos, em toqy.com.br"];

const env = (): Patro => ({
  imgs: [],
  links: [],
  texto: process.env.NEXT_PUBLIC_TV_BANNER_TEXTO ?? "",
  faixas: (process.env.NEXT_PUBLIC_TV_FAIXA ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_FAIXAS),
  camera: "",
  seg: SEG_PADRAO,
});

const imgOk = (s: unknown): s is string => typeof s === "string" && /^\/api\/patro\/img\?i=[0-3]&v=\d+$/.test(s);

// Uma única leitura compartilhada por todos os espaços de patrocínio da página (poucas chamadas, e o CDN guarda 10 s).
const SERVIDOR: Patro = env();
let atual: Patro = SERVIDOR;
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let rodando = false;

async function ler() {
  try {
    const r = await fetch("/api/patro");
    if (r.ok) {
      const j = (await r.json()) as Partial<Patro>;
      const base = env();
      const novo: Patro = {
        imgs: Array.isArray(j.imgs) ? j.imgs.filter(imgOk).slice(0, MAX_IMGS) : [],
        links: Array.isArray(j.links) ? j.links.slice(0, MAX_IMGS).map(limparLink) : [],
        texto: typeof j.texto === "string" && j.texto ? j.texto.slice(0, 120) : base.texto,
        faixas: Array.isArray(j.faixas) && j.faixas.length ? j.faixas.map((x) => String(x).slice(0, 160)).slice(0, MAX_FAIXAS) : base.faixas,
        camera: typeof j.camera === "string" ? j.camera.slice(0, 200) : "",
        seg: limparSeg(j.seg),
      };
      if (JSON.stringify(novo) !== JSON.stringify(atual)) {
        atual = novo;
        ouvintes.forEach((f) => f());
      }
    }
  } catch {
    /* sem rede: mantém o que já está na tela */
  }
  if (rodando) timer = setTimeout(() => void ler(), 45_000);
}

function assinar(f: () => void) {
  ouvintes.add(f);
  if (!rodando) {
    rodando = true;
    void ler();
  }
  return () => {
    ouvintes.delete(f);
    if (!ouvintes.size) {
      rodando = false;
      clearTimeout(timer);
    }
  };
}

/** Lê o patrocínio cadastrado em /admin/patro (igual no site e no OBS). Sem nada cadastrado, vale o padrão do ambiente. */
export function usePatro(): Patro {
  return useSyncExternalStore(assinar, () => atual, () => SERVIDOR);
}

/** Imagens de patrocinadores passando uma a uma, com troca suave. O tamanho vem de quem usa (className); a imagem se ajusta inteira, sem cortar. */
export function Carrossel({ imgs, links = [], seg, alt, desloca = false }: { imgs: string[]; links?: string[]; seg: number; alt: string; desloca?: boolean }) {
  const [i, setI] = useState(0);
  const n = imgs.length;
  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => {
      if (!document.hidden) setI((x) => x + 1);
    }, seg * 1000);
    return () => clearInterval(id);
  }, [n, seg]);
  // desloca: começa na metade da fila, então dois carrosseis lado a lado mostram patrocinadores diferentes ao mesmo tempo
  const ativo = n ? (i + (desloca ? Math.floor(n / 2) || 1 : 0)) % n : 0;
  return (
    <div className="relative h-full w-full">
      {imgs.map((src, k) => {
        const href = links[k];
        const ligado = k === ativo;
        const img = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={ligado ? alt : ""} className="h-full w-full object-contain" />
        );
        const cls = `absolute inset-0 transition-opacity duration-700 ${ligado ? "opacity-100" : "pointer-events-none opacity-0"}`;
        return href ? (
          <a key={src} href={href} target="_blank" rel="noopener noreferrer sponsored" className={cls} aria-hidden={!ligado} tabIndex={ligado ? 0 : -1}>
            {img}
          </a>
        ) : (
          <div key={src} className={cls} aria-hidden={!ligado}>
            {img}
          </div>
        );
      })}
    </div>
  );
}

/** Espaço do patrocínio no Modo TV. Sem nada cadastrado, vira o convite do TOQY. */
export function BannerTv({ p, fill = false, slim = false, desloca = false }: { p: Patro; fill?: boolean; slim?: boolean; desloca?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-3xl border border-line bg-panel ${
        fill ? "min-h-[72px] max-h-[200px] flex-1" : slim ? "h-[clamp(48px,6vh,64px)] shrink-0" : "h-[clamp(72px,11vh,130px)] shrink-0"
      }`}
      aria-label="Publicidade"
    >
      {p.imgs.length ? (
        <Carrossel imgs={p.imgs} links={p.links} seg={p.seg} alt={p.texto || "Patrocinador"} desloca={desloca} />
      ) : p.texto ? (
        <p className="px-4 text-center font-display text-[clamp(1rem,2vw,1.75rem)] font-bold leading-tight">{p.texto}</p>
      ) : (
        <div className="px-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-lime">Feito pelo criador deste site</p>
          <p className={`font-display font-bold leading-tight ${slim ? "text-xl" : "mt-1 text-[clamp(1.25rem,2.4vw,2.25rem)]"}`}>
            TOQY <span className="text-xs font-normal text-mute">toqy.com.br</span>
          </p>
          {slim ? null : <p className="text-sm text-mute">Seu link na bio e cartão digital em minutos · toqy.com.br</p>}
        </div>
      )}
    </div>
  );
}
