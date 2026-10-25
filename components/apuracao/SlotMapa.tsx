"use client";

import { useCallback, useEffect, useState } from "react";
import { brlInt } from "@/lib/slot";

type Ad = { marca: string; frase: string; site: string };
type Pix = { id: string; preco: number; pix: string; qr: string };

/** Espaço de anúncio no canto do mapa: compra por Pix; quem paga mais (o dobro) toma o lugar. */
export default function SlotMapa() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [preco, setPreco] = useState(1000);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch("/api/slot");
        if (r.ok) {
          const j = (await r.json()) as { atual: Ad | null; preco: number };
          if (vivo) {
            setAd(j.atual);
            setPreco(j.preco);
          }
        }
      } catch {
        /* mantém o que já está */
      }
      if (vivo) t = setTimeout(load, 30_000);
    };
    void load();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  const fechar = useCallback(() => setAberto(false), []);

  return (
    <>
      {ad ? (
        <div className="glass-panel rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mute">Anúncio</p>
          <a href={ad.site} target="_blank" rel="noopener noreferrer sponsored nofollow" className="mt-0.5 flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-display text-lg leading-tight">{ad.marca}</span>
              <span className="block truncate text-xs text-mute">{ad.frase}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold">Visitar →</span>
          </a>
          <button onClick={() => setAberto(true)} className="mt-1.5 text-[10px] text-mute underline hover:text-paper">
            Quer este espaço? {brlInt(preco)}
          </button>
        </div>
      ) : (
        <button onClick={() => setAberto(true)} className="glass-panel block w-full rounded-2xl p-3 text-left transition hover:bg-white/[0.05]">
          <span className="block text-[10px] uppercase tracking-[0.18em] text-mute">Anúncio</span>
          <span className="mt-0.5 flex items-center justify-between gap-3">
            <span className="font-display text-lg leading-tight">Este espaço é seu</span>
            <span className="shrink-0 text-sm font-semibold">{brlInt(preco)} →</span>
          </span>
          <span className="block text-xs text-mute">Sua marca no mapa da apuração</span>
        </button>
      )}
      {aberto ? <SlotModal preco={preco} ocupado={ad !== null} onClose={fechar} /> : null}
    </>
  );
}

function SlotModal({ preco, ocupado, onClose }: { preco: number; ocupado: boolean; onClose: () => void }) {
  const [marca, setMarca] = useState("");
  const [frase, setFrase] = useState("");
  const [site, setSite] = useState("");
  const [contato, setContato] = useState("");
  const [isca, setIsca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [avisado, setAvisado] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/slot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca, frase, site, contato, website: isca }) });
      const j = (await r.json()) as { ok: boolean; error?: string; id?: string; preco?: number; pix?: string; qr?: string };
      if (j.ok && j.id && j.pix && j.qr && j.preco) setPix({ id: j.id, preco: j.preco, pix: j.pix, qr: j.qr });
      else setErro(j.error ?? "Não foi possível gerar o Pix agora.");
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function jaPaguei() {
    if (!pix) return;
    setAvisado(true);
    try {
      await fetch("/api/slot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "pago", id: pix.id }) });
    } catch {
      /* o pedido já está registrado; aviso é só prioridade na fila */
    }
  }

  const campo = "h-11 w-full rounded-xl border border-line bg-black/30 px-3 text-sm text-paper outline-none placeholder:text-mute/70 focus:border-lime";
  const rot = "mb-1 block text-xs font-medium text-paper";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Anunciar no mapa">
      <div className="glass-panel-elevated relative my-auto w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-paper">
          ✕
        </button>

        {pix ? (
          <div className="text-center">
            <h2 className="font-display text-2xl">Pague {brlInt(pix.preco)} no Pix</h2>
            <p className="mt-1 text-sm text-mute">Depois que o Pix cair, um revisor confere o anúncio e ele entra no mapa. Costuma levar poucos minutos.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pix.qr} width={200} height={200} alt={`QR Code Pix de ${brlInt(pix.preco)}`} className="mx-auto mt-4 rounded-lg bg-white p-1.5" />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(pix.pix);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  /* ignore */
                }
              }}
              className="mt-3 h-11 rounded-xl border border-line px-4 text-sm hover:bg-white/5"
            >
              {copiado ? "Copiado!" : "Copiar Pix copia e cola"}
            </button>
            <button type="button" onClick={() => void jaPaguei()} disabled={avisado} className="mt-3 block h-12 w-full rounded-xl bg-lime px-4 text-sm font-bold text-ink disabled:opacity-60">
              {avisado ? "Recebido! Vamos conferir o Pix." : `Já paguei ${brlInt(pix.preco)}`}
            </button>
            <p className="mt-3 text-[11px] text-mute">Falaremos com você pelo contato que informou. Se o valor do espaço subir antes da aprovação, combinamos a diferença.</p>
          </div>
        ) : (
          <form onSubmit={gerar}>
            <h2 className="pr-8 font-display text-2xl leading-tight">{ocupado ? "Tomar este espaço" : "Este espaço"} por {brlInt(preco)}</h2>
            <p className="mt-1 text-sm text-mute">
              Seu anúncio fica no canto do mapa até alguém pagar {brlInt(preco * 2)} por ele.
            </p>
            <div className="mt-4 grid gap-3">
              <label>
                <span className={rot}>Marca</span>
                <input value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={40} required placeholder="Nome da sua marca" className={campo} />
              </label>
              <label>
                <span className={rot}>Frase</span>
                <input value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={80} required placeholder="O que você oferece, numa linha" className={campo} />
              </label>
              <label>
                <span className={rot}>Site</span>
                <input value={site} onChange={(e) => setSite(e.target.value)} maxLength={300} required inputMode="url" placeholder="https://suamarca.com.br" className={campo} />
              </label>
              <label>
                <span className={rot}>Contato</span>
                <input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={80} required placeholder="E-mail ou WhatsApp, só a equipe vê" className={campo} />
              </label>
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={isca} onChange={(e) => setIsca(e.target.value)} className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" />
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-black/20 p-3" aria-label="Prévia do anúncio">
              <p className="text-[10px] uppercase tracking-[0.18em] text-mute">Prévia</p>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg leading-tight">{marca || "Sua marca"}</span>
                  <span className="block truncate text-xs text-mute">{frase || "O que você oferece, numa linha"}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold">Visitar →</span>
              </div>
            </div>

            {erro ? <p className="mt-3 text-sm text-amber" role="alert">{erro}</p> : null}
            <button type="submit" disabled={enviando} className="mt-4 h-12 w-full rounded-xl bg-lime px-4 text-sm font-bold text-ink disabled:opacity-60">
              {enviando ? "Gerando…" : "Revisar e gerar o Pix →"}
            </button>
            <p className="mt-3 text-center text-[11px] text-mute">Nada sobre a eleição, candidatos ou partidos. Um revisor lê o anúncio antes de ele ir ao ar.</p>
          </form>
        )}
      </div>
    </div>
  );
}
