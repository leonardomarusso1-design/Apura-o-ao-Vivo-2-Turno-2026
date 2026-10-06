"use client";

import { useEffect, useState } from "react";
import { MAX_FAIXAS } from "@/lib/patro";

type Atual = { texto: string; faixas: string[]; img: string };

/** Reduz a foto no aparelho antes de enviar (banner horizontal, até 1200 px de largura). */
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
    const png = file.type === "image/png";
    let out = cv.toDataURL(png ? "image/png" : "image/jpeg", 0.85);
    if (out.length > 580_000) out = cv.toDataURL("image/jpeg", 0.7); // PNG pesado vira JPG
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PainelPatro() {
  const [senha, setSenha] = useState("");
  const [texto, setTexto] = useState("");
  const [faixas, setFaixas] = useState("");
  const [imgAtual, setImgAtual] = useState("");
  const [imgNova, setImgNova] = useState<string | null>(null); // null = não mexer; "" = remover
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    try {
      const r = await fetch("/api/patro", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as Atual;
      setTexto(j.texto);
      setFaixas(j.faixas.join("\n"));
      setImgAtual(j.img);
    } catch {
      /* sem rede */
    }
  };
  useEffect(() => {
    void carregar();
  }, []);

  const salvar = async () => {
    setEnviando(true);
    setMsg(null);
    try {
      const r = await fetch("/api/patro", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${senha}` },
        body: JSON.stringify({ texto, faixas: faixas.split("\n"), ...(imgNova !== null ? { img: imgNova } : {}) }),
      });
      if (r.ok) {
        setMsg({ ok: true, t: "Salvo. Aparece no site e no OBS em até 30 segundos." });
        setImgNova(null);
        await carregar();
      } else if (r.status === 401) setMsg({ ok: false, t: "Senha errada." });
      else if (r.status === 429) setMsg({ ok: false, t: "Muitas tentativas. Espere 1 minuto." });
      else if (r.status === 503) setMsg({ ok: false, t: "O Redis não respondeu. Tente de novo." });
      else setMsg({ ok: false, t: "Não salvou. Confira a imagem (PNG ou JPG, horizontal)." });
    } catch {
      setMsg({ ok: false, t: "Sem conexão." });
    } finally {
      setEnviando(false);
    }
  };

  const mostra = imgNova === null ? imgAtual : imgNova;
  const campo = "w-full rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime";

  return (
    <main className="mx-auto grid max-w-2xl gap-5 p-4 pb-16 sm:p-8">
      <h1 className="font-display text-2xl">Patrocínio da transmissão</h1>
      <p className="text-sm text-mute">
        O que você salvar aqui aparece no banner e na faixa do Modo TV do site e do OBS, ao mesmo tempo. Vazio = volta a divulgar o TOQY.
      </p>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Senha (a ADMIN_SECRET da Vercel)</span>
        <input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} className={`${campo} h-11`} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Frases da faixa que corre (uma por linha, até {MAX_FAIXAS})</span>
        <textarea rows={5} value={faixas} onChange={(e) => setFaixas(e.target.value)} className={`${campo} py-2`} placeholder={"Padaria do Zé, a melhor de Indaiatuba\nImobiliária Fulano: seu imóvel em 90 dias"} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Banner: texto (aparece quando não há imagem)</span>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campo} h-11`} placeholder="Nome da empresa · telefone" maxLength={120} />
      </label>

      <div className="grid gap-2 text-sm">
        <span className="text-mute">Banner: imagem horizontal (PNG ou JPG, ideal 1200 x 300 px)</span>
        {mostra ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mostra} alt="Prévia do banner" className="max-h-40 w-full rounded-xl border border-line bg-panel object-contain" />
        ) : (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-mute">Sem imagem</p>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-lime px-4 font-semibold text-ink">
            Escolher imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setImgNova(await encolher(f));
                  setMsg(null);
                } catch {
                  setMsg({ ok: false, t: "Não consegui ler essa imagem." });
                }
              }}
            />
          </label>
          {mostra ? (
            <button type="button" onClick={() => setImgNova("")} className="h-11 rounded-xl border border-line px-4 text-mute hover:text-paper">
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void salvar()}
        disabled={enviando || senha.length < 8}
        className="h-12 rounded-xl bg-lime font-semibold text-ink disabled:opacity-40"
      >
        {enviando ? "Salvando..." : "Salvar e publicar"}
      </button>
      {msg ? (
        <p role="status" className={`text-sm ${msg.ok ? "text-lime" : "text-amber"}`}>
          {msg.t}
        </p>
      ) : null}
    </main>
  );
}
