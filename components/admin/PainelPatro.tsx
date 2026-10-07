"use client";

import { useEffect, useState } from "react";
import { MAX_FAIXAS, MAX_IMGS, SEG_MAX, SEG_MIN } from "@/lib/patro";

type Atual = { texto: string; faixas: string[]; imgs: string[]; links: string[]; camera: string; seg: number };

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
  const [camera, setCamera] = useState("");
  const [seg, setSeg] = useState(8);
  const [links, setLinks] = useState<string[]>(Array.from({ length: MAX_IMGS }, () => ""));
  const [atuais, setAtuais] = useState<string[]>([]);
  // por posição: undefined = não mexer; "" = remover; "data:..." = trocar
  const [novas, setNovas] = useState<(string | undefined)[]>(Array.from({ length: MAX_IMGS }, () => undefined));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    try {
      const r = await fetch("/api/patro", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as Atual;
      setTexto(j.texto);
      setFaixas(j.faixas.join("\n"));
      setCamera(j.camera);
      setSeg(j.seg);
      // links vêm na mesma ordem das imagens existentes; a posição real está no i= da URL
      setLinks(Array.from({ length: MAX_IMGS }, (_, i) => j.links[j.imgs.findIndex((u) => u.includes(`i=${i}&`))] ?? ""));
      setAtuais(j.imgs);
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
        body: JSON.stringify({ texto, faixas: faixas.split("\n"), camera, seg, links, imgs: novas.map((x) => (x === undefined ? null : x)) }),
      });
      if (r.ok) {
        setMsg({ ok: true, t: "Salvo. Aparece no site e no OBS em até 1 minuto." });
        setNovas(Array.from({ length: MAX_IMGS }, () => undefined));
        await carregar();
      } else if (r.status === 401) setMsg({ ok: false, t: "Senha errada." });
      else if (r.status === 429) setMsg({ ok: false, t: "Muitas tentativas. Espere 1 minuto." });
      else if (r.status === 503) setMsg({ ok: false, t: "O Redis não respondeu. Tente de novo." });
      else {
        const j = (await r.json().catch(() => ({}))) as { erro?: string };
        setMsg({ ok: false, t: j.erro === "camera" ? "Link da câmera não reconhecido (use YouTube, Twitch ou Cloudflare Stream)." : "Não salvou. Confira as imagens (PNG ou JPG, horizontais)." });
      }
    } catch {
      setMsg({ ok: false, t: "Sem conexão." });
    } finally {
      setEnviando(false);
    }
  };

  const campo = "w-full rounded-xl border border-line bg-black/30 px-3 text-paper outline-none focus:border-lime";
  const trocar = (i: number, v: string | undefined) => setNovas((a) => a.map((x, k) => (k === i ? v : x)));
  // cada imagem salva traz o número da posição na URL (i=)
  const porSlot = Array.from({ length: MAX_IMGS }, (_, i) => atuais.find((u) => u.includes(`i=${i}&`)) ?? "");
  const mostra = (i: number) => (novas[i] === undefined ? porSlot[i] : novas[i]);

  return (
    <main className="mx-auto grid max-w-2xl gap-5 p-4 pb-16 sm:p-8">
      <h1 className="font-display text-2xl">Patrocínio e câmera da transmissão</h1>
      <p className="text-sm text-mute">
        O que você salvar aqui vale no site inteiro e no Modo TV (do site e do OBS), ao mesmo tempo. Sem imagens, o espaço divulga o TOQY.
      </p>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Senha (a ADMIN_SECRET da Vercel)</span>
        <input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} className={`${campo} h-11`} />
      </label>

      <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">Patrocinadores que passam (até {MAX_IMGS})</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: MAX_IMGS }, (_, i) => {
            const img = mostra(i);
            return (
              <div key={i} className="grid content-start gap-2 text-sm">
                <span className="text-mute">Patrocinador {i + 1}</span>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={`Prévia ${i + 1}`} className="aspect-[3/1] w-full rounded-xl border border-line bg-panel object-contain" />
                ) : (
                  <p className="grid aspect-[3/1] place-items-center rounded-xl border border-dashed border-line text-mute">Vazio</p>
                )}
                <input
                  value={links[i]}
                  onChange={(e) => setLinks((a) => a.map((x, k) => (k === i ? e.target.value : x)))}
                  placeholder="Link ao clicar (site, Instagram, WhatsApp)"
                  maxLength={300}
                  className={`${campo} h-10 text-xs`}
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-lime px-3 font-semibold text-ink">
                    Escolher
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        try {
                          trocar(i, await encolher(f));
                          setMsg(null);
                        } catch {
                          setMsg({ ok: false, t: "Não consegui ler essa imagem." });
                        }
                      }}
                    />
                  </label>
                  {img ? (
                    <button type="button" onClick={() => trocar(i, "")} className="h-10 rounded-xl border border-line px-3 text-mute hover:text-paper">
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-mute">Na página de apuração as imagens passam uma a uma; no Modo TV aparecem as 4 juntas, em quadros. Arte que funciona nos dois: 1200 x 800 px (3:2) com a marca no centro, PNG ou JPG. A imagem aparece inteira, sem cortar.</p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-mute">Troca a cada (só na página de apuração)</span>
          <input type="number" min={SEG_MIN} max={SEG_MAX} value={seg} onChange={(e) => setSeg(Number(e.target.value))} className={`${campo} h-10 w-20`} />
          <span className="text-mute">segundos</span>
        </label>
      </fieldset>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Câmera no Modo TV do site (link da transmissão só com a câmera; vazio = mostra a live inteira)</span>
        <input value={camera} onChange={(e) => setCamera(e.target.value)} className={`${campo} h-11`} placeholder="https://www.youtube.com/watch?v=...  ou  https://twitch.tv/seucanal" maxLength={200} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Frases da faixa que corre (uma por linha, até {MAX_FAIXAS})</span>
        <textarea rows={5} value={faixas} onChange={(e) => setFaixas(e.target.value)} className={`${campo} py-2`} placeholder={"Padaria do Zé, a melhor de Indaiatuba\nImobiliária Fulano: seu imóvel em 90 dias"} />
      </label>

      <label className="grid gap-1.5 text-sm">
        <span className="text-mute">Texto de apoio (aparece quando não há imagem e serve de descrição da imagem)</span>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campo} h-11`} placeholder="Nome da empresa" maxLength={120} />
      </label>

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
