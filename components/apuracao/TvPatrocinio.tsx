"use client";

import { useEffect, useState } from "react";

/** Patrocínio do Modo TV: 1 banner (imagem ou texto) + frases que correm na faixa. Vale só neste aparelho (quem faz a live). */
export type Patro = { img: string; texto: string; faixas: string[] };

const CHAVE = "apuracao:tv:patro";
const MAX_FAIXAS = 8;

const env = (): Patro => ({
  img: "",
  texto: process.env.NEXT_PUBLIC_TV_BANNER_TEXTO ?? "",
  faixas: (process.env.NEXT_PUBLIC_TV_FAIXA ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_FAIXAS),
});

const limpa = (p: Patro): Patro => ({
  // só aceita imagem enviada pelo aparelho (data:) ou arquivo do próprio site (/patro/x.png); a CSP bloqueia o resto
  img: /^(data:image\/(png|jpe?g|webp);base64,|\/[\w\-./]+$)/i.test(p.img) ? p.img : "",
  texto: p.texto.slice(0, 120),
  faixas: p.faixas.map((s) => s.slice(0, 160)).filter(Boolean).slice(0, MAX_FAIXAS),
});

export function usePatro(): [Patro, (p: Patro) => void] {
  const [p, setP] = useState<Patro>(env);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (raw) setP(limpa({ ...env(), ...(JSON.parse(raw) as Partial<Patro>) }));
    } catch {
      /* sem armazenamento: usa o padrão do ambiente */
    }
  }, []);
  const salvar = (novo: Patro) => {
    const v = limpa(novo);
    setP(v);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(v));
    } catch {
      /* imagem grande demais ou armazenamento bloqueado: vale só até recarregar */
    }
  };
  return [p, salvar];
}

/** Espaço do banner. Sem nada cadastrado, vira o convite para anunciar (é a venda do espaço). */
export function BannerTv({ p }: { p: Patro }) {
  return (
    <div
      className="flex h-[clamp(84px,15vh,170px)] shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-line bg-panel"
      aria-label="Publicidade"
    >
      {p.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.img} alt={p.texto || "Publicidade"} className="h-full w-full object-contain" />
      ) : p.texto ? (
        <p className="px-4 text-center font-display text-[clamp(1rem,2vw,1.75rem)] font-bold leading-tight">{p.texto}</p>
      ) : (
        <p className="px-4 text-center text-sm text-mute">
          <span className="block text-[10px] font-bold uppercase tracking-[0.25em]">Publicidade</span>
          Anuncie aqui · @leomarussobr
        </p>
      )}
    </div>
  );
}

/** Reduz a foto no aparelho antes de guardar (cabe no armazenamento e não pesa na tela). */
async function encolher(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error("imagem inválida"));
      i.src = url;
    });
    const esc = Math.min(1, 1200 / img.width);
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.width * esc);
    cv.height = Math.round(img.height * esc);
    cv.getContext("2d")?.drawImage(img, 0, 0, cv.width, cv.height);
    const tipo = file.type === "image/png" ? "image/png" : "image/jpeg";
    return cv.toDataURL(tipo, 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function EditorPatro({ p, onChange, onClose }: { p: Patro; onChange: (p: Patro) => void; onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const campo = "rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime";
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-panel p-3 text-sm">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <label className="text-mute" htmlFor="pt-faixa">
            Frases da faixa que corre (uma por linha, até {MAX_FAIXAS})
          </label>
          <textarea
            id="pt-faixa"
            rows={4}
            value={p.faixas.join("\n")}
            onChange={(e) => onChange({ ...p, faixas: e.target.value.split("\n") })}
            placeholder={"Padaria do Zé, a melhor de Indaiatuba\nAnuncie aqui: @leomarussobr"}
            className={`${campo} py-2`}
          />
        </div>
        <div className="grid content-start gap-2">
          <label className="text-mute" htmlFor="pt-texto">
            Banner: texto (aparece se não houver imagem)
          </label>
          <input id="pt-texto" value={p.texto} onChange={(e) => onChange({ ...p, texto: e.target.value })} className={`${campo} h-10`} placeholder="Nome da empresa · telefone" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-lime px-4 font-semibold text-ink">
              Enviar imagem do banner
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    onChange({ ...p, img: await encolher(f) });
                    setMsg("");
                  } catch {
                    setMsg("Não consegui ler essa imagem. Use PNG ou JPG.");
                  }
                }}
              />
            </label>
            {p.img ? (
              <button type="button" onClick={() => onChange({ ...p, img: "" })} className="h-10 rounded-xl border border-line px-4 text-mute hover:text-paper">
                Remover imagem
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="ml-auto h-10 rounded-xl border border-line px-4 text-paper">
              Fechar
            </button>
          </div>
          {msg ? <p className="text-xs text-amber">{msg}</p> : null}
        </div>
      </div>
      <p className="text-[11px] text-mute">Salva sozinho e vale só neste aparelho (o que você transmite na live). Imagem ideal: horizontal, uns 1200 x 300 px.</p>
    </div>
  );
}
